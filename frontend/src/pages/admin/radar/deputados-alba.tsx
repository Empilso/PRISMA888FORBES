import React, { useEffect, useState } from 'react'
import Head from 'next/head'

// Componente para exibir a frota parlamentar ALBA lendo exclusivamente do DADOS-PRISMA
const AdminRadarAlbaPage = () => {
    const [deputados, setDeputados] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // API específica que consome do DADOS-PRISMA (hrrzwh...)
        fetch('/api/prisma/deputados-alba')
            .then(res => res.json())
            .then(data => {
                setDeputados(data)
                setLoading(false)
            })
            .catch(err => {
                console.error('Erro ao carregar Radar PRISMA:', err)
                setLoading(false)
            })
    }, [])

    if (loading) return <div className="p-10 text-center text-white">Carregando Radar Digital (DADOS-PRISMA)...</div>

    return (
        <div className="min-h-screen bg-[#050505] p-8 text-white">
            <Head>
                <title>Radar Digital ALBA | PRISMA 888</title>
            </Head>

            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-end mb-12 border-b border-[#222] pb-6">
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight text-white uppercase italic">
                            Radar Digital <span className="text-blue-500">ALBA</span>
                        </h1>
                        <p className="text-gray-500 mt-2 font-mono">
                            [CONEXÃO EXCLUSIVA DADOS-PRISMA] :: Monitorando 63 Deputados
                        </p>
                    </div>
                    <div className="bg-[#111] px-4 py-2 border border-[#333] rounded-md flex gap-4 text-xs font-bold uppercase">
                        <span className="text-green-500">PRODUÇÃO: 131</span>
                        <span className="text-blue-500">PRESENÇAS: 14.713</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {deputados.map((dep) => (
                        <div
                            key={dep.parlamentar_id}
                            className="bg-black border border-[#1a1a1a] rounded-2xl overflow-hidden hover:border-blue-600 transition-all group"
                        >
                            <div className="flex p-6 gap-6">
                                <div className="w-24 h-24 rounded-xl overflow-hidden grayscale group-hover:grayscale-0 transition-all border border-[#333] flex-shrink-0">
                                    <img
                                        src={dep.foto_url || 'https://via.placeholder.com/150'}
                                        alt={dep.nome}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="flex flex-col justify-between py-1">
                                    <div>
                                        <h2 className="font-black text-xl leading-tight uppercase tracking-tight">{dep.nome}</h2>
                                        <p className="text-blue-600 text-sm font-bold">{dep.partido}</p>
                                        <p className="text-[10px] text-gray-600 uppercase mt-1">{dep.municipio_base || 'Geral'}</p>
                                    </div>
                                    <div className="mt-4">
                                        <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${dep.status_extracao === 'parcial' ? 'bg-blue-600 text-white' : 'bg-[#222] text-gray-500'
                                            }`}>
                                            STATUS: {dep.status_extracao || 'pendente'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-1 bg-[#0a0a0a] p-1 border-t border-[#1a1a1a]">
                                <div className="bg-[#111] p-2 text-center">
                                    <p className="text-[8px] text-gray-600 uppercase">Proposições</p>
                                    <p className="text-xs font-bold">{dep.proposicoes_count || 0}</p>
                                </div>
                                <div className="bg-[#111] p-2 text-center">
                                    <p className="text-[8px] text-gray-600 uppercase">Presenças</p>
                                    <p className="text-xs font-bold">{dep.frequencia_count || 0}</p>
                                </div>
                                <div className="bg-[#111] p-2 text-center">
                                    <p className="text-[8px] text-gray-600 uppercase">Emendas</p>
                                    <p className="text-xs font-bold">{dep.emendas_count || 0}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default AdminRadarAlbaPage
