// API Route: Create Zone
// POST /api/zones/create

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractStreetsFromOSM, cleanStreets } from '@/lib/overpass';
import { generateSegments } from '@/lib/streets';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nom, geom, userId } = body;

    if (!nom || !geom) {
      return NextResponse.json(
        { error: 'Missing required fields: nom, geom' },
        { status: 400 }
      );
    }

    // Validate GeoJSON polygon
    if (
      geom.type !== 'Polygon' ||
      !Array.isArray(geom.coordinates) ||
      geom.coordinates.length === 0
    ) {
      return NextResponse.json(
        { error: 'Invalid polygon geometry' },
        { status: 400 }
      );
    }

    console.log(`Creating zone: ${nom}`);

    // Step 1: Create zone in database
    const zone = await db.createZone(nom, geom, userId);
    console.log(`Zone created with ID: ${zone.id}`);

    // Step 2: Extract streets from OpenStreetMap using Overpass API
    console.log('Extracting streets from OpenStreetMap...');
    let osmStreets;
    try {
      osmStreets = await extractStreetsFromOSM(geom.coordinates, {
        timeout: 25,
        includeResidential: true,
        includeService: true,
        includePaths: false,
      });

      // Clean and validate streets
      osmStreets = cleanStreets(osmStreets);

      console.log(`Extracted ${osmStreets.length} streets from OSM`);
    } catch (error) {
      console.error('Error extracting streets from OSM:', error);
      return NextResponse.json(
        {
          error: 'Failed to extract streets from OpenStreetMap',
          details: String(error),
          zone,
        },
        { status: 500 }
      );
    }

    // Step 3: Save streets to database and generate segments
    let totalSegments = 0;

    for (const osmStreet of osmStreets) {
      try {
        // Save street
        const street = await db.insertStreet(
          zone.id,
          osmStreet.id,
          osmStreet.name,
          osmStreet.geometry,
          osmStreet.tags
        );

        // Generate pair/impair segments
        const segments = await generateSegments(osmStreet, zone.id, street.id);
        totalSegments += segments.length;

        console.log(
          `Street "${osmStreet.name}": ${segments.length} segments generated`
        );
      } catch (error) {
        console.error(
          `Error processing street ${osmStreet.name}:`,
          error
        );
        // Continue with other streets
      }
    }

    console.log(`Total segments generated: ${totalSegments}`);

    // Step 4: Get complete zone data with segments
    const zoneWithData = {
      ...zone,
      stats: {
        totalStreets: osmStreets.length,
        totalSegments,
      },
    };

    return NextResponse.json(
      {
        success: true,
        zone: zoneWithData,
        message: `Zone created with ${osmStreets.length} streets and ${totalSegments} segments`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating zone:', error);
    return NextResponse.json(
      {
        error: 'Failed to create zone',
        details: String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    const zones = await db.getAllZones(userId || undefined);

    return NextResponse.json({
      success: true,
      zones,
      count: zones.length,
    });
  } catch (error) {
    console.error('Error fetching zones:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch zones',
        details: String(error),
      },
      { status: 500 }
    );
  }
}
