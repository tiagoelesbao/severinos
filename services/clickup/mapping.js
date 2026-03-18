/**
 * Real static mapping between Virals organizational structure and ClickUp IDs.
 * Extracted directly from the "Oraclum" workspace.
 */

const VIRALS_CLICKUP_MAPPING = {
    "Gestão": {
        id: "901312418172",
        areas: {
            "Financeiro": {
                id: "901316371991",
                processes: {
                    "Contas a Pagar": "901324654387",
                    "Contas a Receber": "901324654370",
                    "Transações Conciliadas": "901324654368",
                    "Gestão de Ferramentas": "901324654363",
                    "Auditorias de Pagamentos": "901324654364"
                }
            },
            "Administrativo": {
                id: "901316550324",
                processes: {
                    "Responsabilidades": "901324633919"
                }
            },
            "Jurídico": {
                id: "901316543249",
                processes: {
                    "Gestão de Processos Jurídicos": "901324623155",
                    "Gestão Contratual": "901324623188"
                }
            },
            "Rotinas Organizacionais": {
                id: "901316563160",
                processes: {
                    "Encontros & Rituais": "901324652037",
                    "Reuniões Gerais": "901324652057",
                    "Atividades Rotineiras": "901324652063"
                }
            }
        }
    },
    "Gente & Cultura": {
        id: "901312944890",
        areas: {
            "Área de Recrutamento": {
                id: "901316634163",
                processes: {
                    "Recrutamento & Seleção": "901324752551",
                    "Banco de Talentos": "901324752552"
                }
            },
            "Base Militar 💣": {
                id: "901316634165",
                processes: {
                    "Batalhão de Operações Especiais": "901324752560",
                    "e-NPS": "901324782131"
                }
            },
            "Área Educacional": {
                id: "901316634164",
                processes: {
                    "Performance & Growth": "901324752549",
                    "Planejamento Estratégico": "901324752548",
                    "Produção de Conteúdo": "901324752550",
                    "Automações & Integrações": "901324752553",
                    "Desenvolvimento Web": "901324752554",
                    "Produtos": "901324752555",
                    "Vendas": "901324752556",
                    "Liderança": "901324752557",
                    "Desenvolvimento Pessoal": "901324752558"
                }
            },
            "Relatório de Desempenho": {
                id: "901316634168",
                processes: {
                    "Tasks Overdue": "901324752569",
                    "Tasks Entregues": "901324752568"
                }
            }
        }
    },
    "Produto": {
        id: "901312526724",
        areas: {
            "Gestão de Produtos": {
                id: "901316100058",
                processes: {
                    "Painel de Produtos": "901323987788",
                    "Estratégia de Produto": "901323992267",
                    "Controle de Qualidade & Usabilidade": "901323992292",
                    "Reestruturação & Melhorias": "901323992324"
                }
            },
            "Sucesso do Cliente": {
                id: "901316370384",
                processes: {
                    "Entrada do Cliente": "901324378139",
                    "Atendimento & Suporte": "901324378336",
                    "Processo de NPS": "901324837380",
                    "Mapeamento dos Problemas": "901324837379",
                    "Gestão de Crise": "901324837385",
                    "Saída do Cliente": "901324837390"
                }
            },
            "Gestão de Entregas": {
                id: "901316738859",
                processes: {
                    "Mentorias & Consultorias": "901324898532",
                    "Check-ins": "901324898534",
                    "Prestação de Contas": "901324898530"
                }
            }
        }
    },
    "Projetos": {
        id: "901312966335",
        areas: {
            "Painel de Projetos": {
                id: "901316668858",
                processes: {
                    "Projetos Internos": "901324798951",
                    "Projetos Externos": "901324799752"
                }
            },
            "Virals Validation": {
                id: "901316668857",
                processes: {
                    "Implementação [Kickoff]": "901324798950",
                    "Ativação & Testes": "901324798948",
                    "Validação & Escala": "901324798949",
                    "Encerramento & Upgrade": "901324798947"
                }
            },
            "Gestão de Projetos Externos": {
                id: "901317784149",
                processes: {
                    "Planejamento & Preparação": "901326390257",
                    "Execução & Monitoramento": "901326390256",
                    "Finalização & Encerramento": "901326390258"
                }
            }
        }
    },
    "Marketing": {
        id: "901312175004",
        areas: {
            "Planejamento Estratégico": {
                id: "901316477565",
                processes: {
                    "Estratégias & Funis": "901324531491"
                }
            },
            "Produção de Conteúdo": {
                id: "901316010865",
                processes: {
                    "Máquina de Idéias": "901323880800",
                    "Planejamentos & Cronogramas": "901323880825",
                    "Processo de Copywriting": "901323880831",
                    "Processo de Design e Criação": "901323855100",
                    "Agendamento, Publicações & Disparos": "901323880843"
                }
            },
            "Performance & Growth 🚫": {
                id: "901317466678",
                processes: {
                    "Gestão de Campanhas": "901325936644",
                    "Processo de Otimização": "901325936638",
                    "Gestão de Investimentos": "901325936642",
                    "Trackeamento & Dashboards": "901325936637",
                    "🔬 Laboratório de Criativos": "901325936634"
                }
            },
            "Processos de Automações": {
                id: "901317466681",
                processes: {
                    "Gestão de Fluxos": "901325936640",
                    "Gestão de WhatsApp": "901325936641"
                }
            },
            "Desenvolvimento Web": {
                id: "901317466675",
                processes: {
                    "Landing Page & Website": "901325936633",
                    "Manutenção & Atualizações": "901325936629",
                    "Gestão de Domínios & Hospedagens": "901325936630"
                }
            }
        }
    },
    "Comercial": {
        id: "901312526794",
        areas: {
            "Consultorias, Serviços & Mentorias": {
                id: "901316170726",
                processes: {
                    "Prospecção Direta": "901324091180",
                    "Aplicação Direta": "901324135434",
                    "Social Selling": "901325938258",
                    "Reunião Closer": "901324091695",
                    "Recuperação & Nutrição": "901323855361"
                }
            },
            "Treinamentos, Cursos & Templates": {
                id: "901317467847",
                processes: {
                    "Recuperação de Vendas 🔥": "901325938240"
                }
            },
            "CRM": {
                id: "901316170771",
                processes: {
                    "Gestão de Clientes": "901324091242",
                    "Processo de Renovação": "901324392047",
                    "Gestão de Novas Oportunidades": "901324406313"
                }
            },
            "Hunter ADS System": {
                id: "901317132090",
                processes: {
                    "Prospecção": "901325463808"
                }
            },
            "CRM Hunter": {
                id: "901317132094",
                processes: {
                    "List": "901325463813"
                }
            }
        }
    },
    "OPS": {
        id: "901313436808",
        areas: {
            "Rocks Trimestrais": {
                id: "901317466926",
                processes: {
                    "List": "901325936960"
                }
            },
            "Objetivos & Metas (OKR)": {
                id: "901316483302",
                processes: {
                    "Q1 - FUNDAÇÃO": "901324539965",
                    "Q2 - TRAÇÃO": "901324542703",
                    "Q3 - AUTORIDADE": "901324542712",
                    "Q4 - CONSOLIDAÇÃO": "901324542728"
                }
            },
            "Processos & POPs": {
                id: "901316565019",
                processes: {
                    "Mapeamento de Processos": "901324654421",
                    "Construção de POPs": "901324654420"
                }
            },
            "Lançamentos": {
                id: "901317466930",
                processes: {
                    "List": "901325936969"
                }
            },
            "BI & Métricas": {
                id: "901317466936",
                processes: {
                    "List": "901325936978"
                }
            },
            "Saúde Operacional": {
                id: "901317466942",
                processes: {
                    "List": "901325936985"
                }
            }
        }
    }
};

/**
 * Resolves a human-readable string path into a ClickUp List ID.
 */
function getListId(departmentName, areaName, processName) {
    const department = VIRALS_CLICKUP_MAPPING[departmentName];
    if (!department) throw new Error(`Departamento '${departmentName}' não encontrado no mapping. Options: ${Object.keys(VIRALS_CLICKUP_MAPPING)}`);
    
    // Exact or loose match for areas to avoid subtle trim errors (e.g., Performance & Growth 🚫 vs Performance & Growth)
    const areaKey = Object.keys(department.areas).find(k => k.includes(areaName) || areaName.includes(k));
    const area = department.areas[areaKey];
    if (!area) throw new Error(`Área '${areaName}' não encontrada dentro de '${departmentName}'. Options: ${Object.keys(department.areas)}`);

    const processKey = Object.keys(area.processes).find(k => k.includes(processName) || processName.includes(k));
    const listId = area.processes[processKey];
    if (!listId) throw new Error(`Processo/Lista '${processName}' não encontrado na área '${areaKey}'. Options: ${Object.keys(area.processes)}`);

    return listId;
}

module.exports = {
    VIRALS_CLICKUP_MAPPING,
    getListId
};
