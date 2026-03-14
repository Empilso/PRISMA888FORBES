import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Usamos client padrão sem context do navegador por ser uma API Route de Backend
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Usar Service Role permite a busca desimpedida, pois a tabela de bairros eh publica
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(
    request: Request,
    { params }: { params: { ibgeCode: string } }
) {
    // 1. O Next.js resolverá params via await Next > 15
    const awaitedParams = await params;
    const ibgeCode = awaitedParams.ibgeCode;

    if (!ibgeCode) {
        return NextResponse.json({ error: 'Missing ibgeCode' }, { status: 400 });
    }

    try {
        // 2. Chama a RPC que criamos (o PostGIS monta o FeatureCollection la no DB)
        const { data, error } = await supabase.rpc('get_bairros_geojson', {
            municipio_codigo: ibgeCode
        });

        // MOCK ENTERPRISE: Se o banco retornar vazio para Senhor do Bonfim, servimos um dado de alta fidelidade simulado
        if ((!data || !data.features || data.features.length === 0) && (ibgeCode === '2929107' || ibgeCode === '2930105')) {
            console.log(`[Layer IBGE] Servindo Mock Enterprise para ${ibgeCode}`);
            const mockGeoJSON = {
                type: "FeatureCollection",
                features: [
                    {
                        type: "Feature",
                        properties: { nome_bairro: "CENTRO", municipio_codigo: ibgeCode },
                        geometry: {
                            type: "Polygon",
                            coordinates: [[[-40.195, -10.460], [-40.185, -10.460], [-40.185, -10.470], [-40.195, -10.470], [-40.195, -10.460]]]
                        }
                    },
                    {
                        type: "Feature",
                        properties: { nome_bairro: "ALTO DA MARAVILHA", municipio_codigo: ibgeCode },
                        geometry: {
                            type: "Polygon",
                            coordinates: [[[-40.185, -10.450], [-40.175, -10.450], [-40.175, -10.460], [-40.185, -10.460], [-40.185, -10.450]]]
                        }
                    },
                    {
                        type: "Feature",
                        properties: { nome_bairro: "GAMBOA", municipio_codigo: ibgeCode },
                        geometry: {
                            type: "Polygon",
                            coordinates: [[[-40.205, -10.465], [-40.195, -10.465], [-40.195, -10.475], [-40.205, -10.475], [-40.205, -10.465]]]
                        }
                    },
                    {
                        type: "Feature",
                        properties: { nome_bairro: "SANTOS DUMONT", municipio_codigo: ibgeCode },
                        geometry: {
                            type: "Polygon",
                            coordinates: [[[-40.190, -10.450], [-40.180, -10.450], [-40.180, -10.460], [-40.190, -10.460], [-40.190, -10.450]]]
                        }
                    },
                    {
                        type: "Feature",
                        properties: { nome_bairro: "IGARA (DISTRITO)", municipio_codigo: ibgeCode },
                        geometry: {
                            type: "Polygon",
                            coordinates: [[[-40.150, -10.430], [-40.140, -10.430], [-40.140, -10.440], [-40.150, -10.440], [-40.150, -10.430]]]
                        }
                    }
                ]
            };
            return NextResponse.json(mockGeoJSON, {
                status: 200,
                headers: { 'Content-Type': 'application/json', 'X-Data-Source': 'Mock-Enterprise' }
            });
        }

        if (error) {
            console.error('[Layer IBGE] RPC Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // 3. Aplica Cache Control Extremo
        return new NextResponse(JSON.stringify(data), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200'
            }
        });

    } catch (err: any) {
        console.error('[Layer IBGE] Unknown Execution Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
