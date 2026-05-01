export type StandardRegion = 'UAE' | 'Gulf' | 'International';
export type StandardCategory = 'Building Codes' | 'Materials' | 'Structural' | 'Testing' | 'Safety' | 'Contracts' | 'Sustainability' | 'Electrical' | 'Plumbing' | 'Mechanical';

export interface ConstructionStandard {
    id: string;
    region: StandardRegion;
    category: StandardCategory;
    title: string;
    description: string;
    brief: string;
    url: string;
    sourceName: string;
}

export const constructionStandards: ConstructionStandard[] = [
    // ================== UAE STANDARDS ==================
    {
        id: 'uae-1',
        region: 'UAE',
        category: 'Building Codes',
        title: 'Dubai Building Code (DBC)',
        description: 'Unified building design and execution regulations across Dubai.',
        brief: 'The Dubai Building Code (DBC) unites various independent guidelines into a single comprehensive manual for design and execution across the Emirate of Dubai. Mandated by the Dubai Development Authority (DDA) and Dubai Municipality (DM) since 2022, the code serves to regulate health, safety, environmental sustainability, and the structural integrity of all building types. It drastically streamlines the NOC and permitting process by standardizing requirements for civil, structural, mechanical, and electrical subsystems under one roof.',
        url: 'https://dda.gov.ae/',
        sourceName: 'Dubai Development Authority (DDA)'
    },
    {
        id: 'uae-2',
        region: 'UAE',
        category: 'Building Codes',
        title: 'Abu Dhabi International Building Code (ADIBC)',
        description: 'Structural and life-safety codes governing construction in Abu Dhabi.',
        brief: 'Adopted and localized by the Department of Municipalities and Transport (DMT), the ADIBC is founded upon the internationally recognized framework of the International Building Code (IBC). It imposes detailed safety thresholds for fire resistance, structural loads, foundations, and exit pathways tailored specifically for the extreme thermal and environmental conditions of the Emirate of Abu Dhabi.',
        url: 'https://www.dmt.gov.ae/',
        sourceName: 'Abu Dhabi DMT'
    },
    {
        id: 'uae-3',
        region: 'UAE',
        category: 'Sustainability',
        title: 'Estidama Pearl Rating System (PRS)',
        description: 'The primary green building framework for Abu Dhabi infrastructure.',
        brief: 'Estidama ("Sustainability" in Arabic) was launched to ensure that urban expansion is environmentally, socially, and economically balanced. The Pearl Rating System calculates a project\'s sustainability through complex criteria involving water conservation, solar heat gain prevention, indigenous landscaping, and energy recovery systems. A minimum 1-Pearl rating is required for private developments, while government buildings must achieve a 2-Pearl rating.',
        url: 'https://www.dmt.gov.ae/',
        sourceName: 'Abu Dhabi DMT'
    },
    {
        id: 'uae-4',
        region: 'UAE',
        category: 'Sustainability',
        title: 'Al Sa\'fat - Dubai Green Building System',
        description: 'Dubai\'s compulsory environmental rating framework.',
        brief: 'Al Sa\'fat replaced the older Dubai Green Building Regulations, enforcing a tiered "Sa\'fa" rating logic (Bronze, Silver, Gold, Platinum). It rigorously governs ventilation quality, toxic material restrictions, HVAC efficiency, green energy usage, and site ecology. Silver is currently the absolute mandatory baseline for all new residential, commercial, and industrial permits approved by the Dubai Municipality.',
        url: 'https://www.dm.gov.ae/',
        sourceName: 'Dubai Municipality'
    },
    {
        id: 'uae-5',
        region: 'UAE',
        category: 'Safety',
        title: 'UAE Fire and Life Safety Code of Practice',
        description: 'Mandatory nationwide fire protection and egress regulations.',
        brief: 'Maintained by the UAE Civil Defense, this manual is arguably the most critical safety document in the region. It extensively regulates cladding materials, fire compartmentalization, sprinkler densities, smoke evacuation capacities, and egress travel distances. The code aims to heavily safeguard occupants from catastrophic fire incidents, panic scenarios, and structural degradation during thermal events.',
        url: 'https://www.dcd.gov.ae/',
        sourceName: 'UAE Civil Defense'
    },
    {
        id: 'uae-6',
        region: 'UAE',
        category: 'Electrical',
        title: 'DEWA Regulations for Electrical Installations',
        description: 'Statutory rules for power distribution and electrical wiring in Dubai.',
        brief: 'The Dubai Electricity and Water Authority (DEWA) regulations outline the stringent requirements for designing, installing, testing, and maintaining electrical distribution networks in consumer premises. It ensures that cabling limits voltage drops to acceptable thresholds, sets up rigid grounding protocols for short-circuit protection, and standardizes switchgear setups to ensure grid stability.',
        url: 'https://www.dewa.gov.ae/',
        sourceName: 'DEWA'
    },
    {
        id: 'uae-7',
        region: 'UAE',
        category: 'Building Codes',
        title: 'Dubai Universal Design Code (DUDC)',
        description: 'Regulations to ensure accessibility and mobility for People of Determination.',
        brief: 'The DUDC is part of the "My Community" initiative, explicitly designed to transform Dubai into a completely barrier-free environment. It dictates gradient slopes for ramps, dimensional clearances for elevators, tactile paving strategies for the visually impaired, and accessible facility standards across public spaces, commercial properties, and transport hubs.',
        url: 'https://www.dm.gov.ae/',
        sourceName: 'Dubai Municipality'
    },

    // ================== GULF (GCC) STANDARDS ==================
    {
        id: 'gulf-1',
        region: 'Gulf',
        category: 'Building Codes',
        title: 'Saudi Building Code (SBC)',
        description: 'The supreme set of technical regulations for construction in KSA.',
        brief: 'The Saudi Building Code (SBC) is the ultimate legal framework enacted to standardize construction across the Kingdom of Saudi Arabia. Driven by Vision 2030, it encompasses multiple volumes covering soil testing (SBC 303), concrete structures (SBC 304), fire safety (SBC 801), and energy efficiency. Compliance is continuously enforced via the "Balady" government platform before any municipality approves building permits or issues occupancy certificates.',
        url: 'https://sbc.gov.sa/',
        sourceName: 'SBC National Committee'
    },
    {
        id: 'gulf-2',
        region: 'Gulf',
        category: 'Building Codes',
        title: 'Qatar Construction Specifications (QCS)',
        description: 'Technical guidance determining the quality framework for Qatar.',
        brief: 'The QCS acts as the undisputed baseline for public and private projects administered by Ashghal (Public Works Authority) and the Ministry of Municipality in Qatar. It defines exhaustive specifications concerning earthworks, pavement mixes, concrete durability under high chloride environments, and structural tolerances to guarantee world-class infrastructural resilience.',
        url: 'https://www.ashghal.gov.qa/',
        sourceName: 'Ashghal / MME'
    },
    {
        id: 'gulf-3',
        region: 'Gulf',
        category: 'Building Codes',
        title: 'Kuwait Building Code (KBC)',
        description: 'Local municipality codes and MEW regulations for Kuwait.',
        brief: 'Combining directives from the Kuwait Municipality and the Ministry of Electricity and Water (MEW), this code focuses significantly on energy conservation methodologies targeting A/C tonnage limits, insulation requirements (K-values), and setback regulations to accommodate Kuwait\'s extreme summer microclimate.',
        url: 'https://www.baladia.gov.kw/',
        sourceName: 'Kuwait Municipality'
    },
    {
        id: 'gulf-4',
        region: 'Gulf',
        category: 'Building Codes',
        title: 'Gulf Building Code (GBC)',
        description: 'Harmonized code promoting standardization across the GCC.',
        brief: 'The Gulf Building Code is an overarching collaborative framework generated by the GCC Standardization Organization. Recognizing the identical terrestrial and climatic challenges spanning from Oman to Kuwait, the GBC encourages unified material testing standards, shared sustainability goals, and cross-border engineering uniformity.',
        url: 'https://www.gso.org.sa/en/',
        sourceName: 'GSO'
    },
    {
        id: 'gulf-5',
        region: 'Gulf',
        category: 'Materials',
        title: 'SASO Technical Building Regulations',
        description: 'Strict manufacturing and import criteria for construction products in KSA.',
        brief: 'The Saudi Standards, Metrology and Quality Organization (SASO) applies technical regulations governing the specific physical and chemical characteristics of cement, reinforcing rebars, tiles, and sanitary wares. Importers and local manufacturers must obtain the "SASO Quality Mark" to legally utilize these materials in domestic construction projects.',
        url: 'https://www.saso.gov.sa/',
        sourceName: 'SASO'
    },
    {
        id: 'gulf-6',
        region: 'Gulf',
        category: 'Materials',
        title: 'GSO General Technical Regulations for Construction Materials',
        description: 'Specifications for locally produced and imported building materials.',
        brief: 'The Gulf Standardization Organization (GSO) imposes strict technical requirements, testing methodologies, and acceptable thresholds for vital construction materials imported or produced in the GCC. It guarantees the structural and chemical resilience of essential items like ready-mix concrete, aggregates, reinforcing rebars, and cement blocks across the entire region.',
        url: 'https://www.gso.org.sa/',
        sourceName: 'GSO Standards Store'
    },

    // ================== INTERNATIONAL STANDARDS ==================
    {
        id: 'int-1',
        region: 'International',
        category: 'Testing',
        title: 'ASTM International Standards',
        description: 'The global dictionary for defining material properties and test methods.',
        brief: 'ASTM International maintains over 12,000 active consensus standards serving as the backbone of global material science. In the construction domain, standards like ASTM C39 (compressive strength of concrete cylinders) or ASTM A615 (specification for deformed carbon-steel bars) are universally applied to guarantee precise material behavior prior to and during structural erection.',
        url: 'https://www.astm.org/',
        sourceName: 'ASTM'
    },
    {
        id: 'int-2',
        region: 'International',
        category: 'Building Codes',
        title: 'International Building Code (IBC)',
        description: 'The foundation of modern municipal building compliance models.',
        brief: 'Authored by the International Code Council (ICC), the IBC is comprehensively updated every three years. It provides expansive engineering guidance on occupancy classifications, building height restrictions, seismic engineering limitations, and life-safety thresholds. The IBC is frequently adopted directly or serves as the core blueprint for governmental codes in the Middle East and worldwide.',
        url: 'https://www.iccsafe.org/',
        sourceName: 'International Code Council'
    },
    {
        id: 'int-3',
        region: 'International',
        category: 'Safety',
        title: 'NFPA Codes and Standards',
        description: 'The paramount global authority on fire, electrical, and life safety.',
        brief: 'The National Fire Protection Association (NFPA) develops hazard control standards that are universally revered. Key documents include NFPA 13 (Installation of Sprinkler Systems), NFPA 72 (National Fire Alarm Code), and NFPA 70 (National Electrical Code). Implementing NFPA protocols is vital to mitigating catastrophic fire damage and securing property insurance approvals.',
        url: 'https://www.nfpa.org/',
        sourceName: 'NFPA'
    },
    {
        id: 'int-4',
        region: 'International',
        category: 'Structural',
        title: 'ACI 318 - Structural Concrete Code',
        description: 'Definitive engineering requirements for designing reinforced concrete.',
        brief: 'The American Concrete Institute\'s ACI 318 provides minimum requirements for materials, design, and detailing of structural concrete buildings. It governs complex mechanics like shear strength calculations, rebar development lengths, column buckling factors, and deflection limits, acting as the primary reference for structural engineers designing cast-in-place frameworks.',
        url: 'https://www.concrete.org/',
        sourceName: 'American Concrete Institute (ACI)'
    },
    {
        id: 'int-5',
        region: 'International',
        category: 'Mechanical',
        title: 'ASHRAE Standards',
        description: 'Global directives for heating, ventilation, and air conditioning systems.',
        brief: 'The American Society of Heating, Refrigerating and Air-Conditioning Engineers (ASHRAE) sets the scientific baseline for human comfort and energy efficiency. Standard 90.1 defines minimum energy-efficient designs for buildings, while Standard 62.1 specifies the stringent fresh-air ventilation rates necessary to maintain acceptable indoor air quality (IAQ).',
        url: 'https://www.ashrae.org/',
        sourceName: 'ASHRAE'
    },
    {
        id: 'int-6',
        region: 'International',
        category: 'Testing',
        title: 'BSI Eurocodes (BS EN)',
        description: 'European harmonized rules for civil and structural engineering.',
        brief: 'The British Standards Institution adopting the European normalizations (EN) presents a series of 10 deeply interconnected structural codes spanning from Eurocode 0 (Basis of Design) to Eurocode 8 (Earthquake Resistance). The Eurocodes represent one of the world\'s most advanced limit-state design methodologies, replacing legacy British Standards (BS) like BS 8110 and BS 5950.',
        url: 'https://www.bsigroup.com/',
        sourceName: 'British Standards Institution'
    },
    {
        id: 'int-7',
        region: 'International',
        category: 'Structural',
        title: 'AISC Steel Construction Manual',
        description: 'The absolute reference for structural steel fabrication and erection.',
        brief: 'The American Institute of Steel Construction (AISC) defines the Load and Resistance Factor Design (LRFD) approaches used throughout the world to design skyscrapers, bridges, and industrial hangars. It provides exhaustive tables for calculating bolt shear limits, weld throat capacities, and steel beam local bucking criteria.',
        url: 'https://www.aisc.org/',
        sourceName: 'AISC'
    },
    {
        id: 'int-8',
        region: 'International',
        category: 'Contracts',
        title: 'FIDIC Conditions of Contract',
        description: 'The international legal standard for engineering and construction contracts.',
        brief: 'Published by the International Federation of Consulting Engineers, the FIDIC suite (Rainbow Suite) standardizes massive infrastructure agreements. The "Red Book" favors employer-designed projects, the "Yellow Book" governs design-build scenarios, and the "Silver Book" manages turnkey EPC projects. It is universally applied to manage claim procedures, time extensions, and risk allocation legally.',
        url: 'https://fidic.org/',
        sourceName: 'FIDIC'
    },
    {
        id: 'int-9',
        region: 'International',
        category: 'Safety',
        title: 'OSHA Construction Standards (29 CFR 1926)',
        description: 'The ultimate framework for occupational safety on construction worksites.',
        brief: 'The Occupational Safety and Health Administration (OSHA) enforces brutal but necessary constraints to prevent worksite accidents. Part 1926 specifies minimum scaffolding load ratings, exact fall-protection tie-off requirements, hazardous chemical labeling protocols, and excavation shoring mandates, saving millions of lives in the hazardous construction sector.',
        url: 'https://www.osha.gov/',
        sourceName: 'OSHA'
    },
    {
        id: 'int-13',
        region: 'International',
        category: 'Sustainability',
        title: 'LEED (Leadership in Energy and Environmental Design)',
        description: 'Widely used green building rating system providing an efficiency framework.',
        brief: 'LEED is the most widely adopted sustainable building rating system globally, administered by the USGBC. It assesses building projects according to their ecological impact, water conservation, energy efficiencies (using ASHRAE baselines), sustainable material sourcing, and indoor environmental quality. Projects earn points to achieve Certified, Silver, Gold, or Platinum status, ensuring long-term operational sustainability and commercial real-estate value.',
        url: 'https://www.usgbc.org/leed',
        sourceName: 'USGBC'
    },
    {
        id: 'int-10',
        region: 'International',
        category: 'Plumbing',
        title: 'International Plumbing Code (IPC)',
        description: 'Regulations to protect public health through sanitary piping design.',
        brief: 'Created by the ICC, the IPC focuses on the safe installation of plumbing systems to prevent cross-contamination, waterborne diseases, and unsanitary drainage. It defines mathematically proven pipe sizing for water supply networks, sanitary drainage slopes, venting mechanics, and the proper inclusion of backflow preventers.',
        url: 'https://www.iccsafe.org/',
        sourceName: 'ICC'
    },
    {
        id: 'int-11',
        region: 'International',
        category: 'Electrical',
        title: 'IEEE Standards Association',
        description: 'Technical standards universally defining electrical infrastructure networks.',
        brief: 'The Institute of Electrical and Electronics Engineers (IEEE) regulates the highly technical aspects of power grids, telecommunications, and low-current systems within buildings. IEEE engineering benchmarks govern grounding systems, substation protection layouts, and data center topologies required to run modern intelligent buildings securely.',
        url: 'https://standards.ieee.org/',
        sourceName: 'IEEE'
    },
    {
        id: 'int-12',
        region: 'International',
        category: 'Testing',
        title: 'ISO Quality & Environmental Management (ISO 9001 / 14001)',
        description: 'Global baselines for corporate quality assurance and ecological management.',
        brief: 'The International Organization for Standardization provides the ISO 9001 standard to enforce rigorous procedural traceability, non-conformance tracking, and audit mechanisms within contracting firms. ISO 14001 adds essential constraints for managing construction waste processing, preventing soil pollution, and minimizing ecological disruption at the corporate tier.',
        url: 'https://www.iso.org/',
        sourceName: 'ISO'
    }
];

export const getStandardsByRegion = (region: StandardRegion | 'All'): ConstructionStandard[] => {
    if (region === 'All') return constructionStandards;
    return constructionStandards.filter(s => s.region === region);
};

export const searchStandards = (query: string, region: StandardRegion | 'All'): ConstructionStandard[] => {
    const list = getStandardsByRegion(region);
    if (!query.trim()) return list;

    const lowerQuery = query.toLowerCase();
    return list.filter(item => 
        item.title.toLowerCase().includes(lowerQuery) ||
        item.description.toLowerCase().includes(lowerQuery) ||
        item.brief.toLowerCase().includes(lowerQuery) ||
        item.category.toLowerCase().includes(lowerQuery) ||
        item.sourceName.toLowerCase().includes(lowerQuery)
    );
};
