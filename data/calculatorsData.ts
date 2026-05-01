// Construction Management Pro - 100+ Calculators Database
// This file contains the schema and data for the dynamic calculator engine.

export type CalcCategory = 'civil' | 'structural' | 'mep' | 'hvac' | 'plumbing' | 'geotech' | 'financial' | 'productivity';

export type InputField = {
    id: string;
    label: string;
    placeholder?: string;
    type: 'number' | 'select';
    options?: { label: string; value: string }[]; // For dropdowns
    unitMetric?: string;
    unitImperial?: string;
};

export type OutputField = {
    id: string;
    label: string;
    unitMetric?: string;
    unitImperial?: string;
    isPrimary?: boolean;
};

export type CalculatorDefinition = {
    id: string;
    name: string;
    category: CalcCategory;
    description: string;
    iconName: string; // lucide-react-native icon name
    inputs: InputField[];
    outputs: OutputField[];
    referenceText?: string;
    // The calculation logic: takes a dictionary of input values and a boolean for metric.
    // Returns a dictionary of output values (matching OutputField IDs).
    calculate: (inputs: Record<string, number>, isMetric: boolean) => Record<string, string>;
};

export const calculatorsData: CalculatorDefinition[] = [
    // ==========================================
    // CIVIL & STRUCTURAL
    // ==========================================
    {
        id: 'beam-deflection-simple',
        name: 'Simple Beam Deflection',
        category: 'structural',
        description: 'Calculate max deflection for a simply supported beam with a center point load.',
        iconName: 'Minus',
        referenceText: 'Formula: Δ = (P * L³) / (48 * E * I). Ensure consistent units (e.g. inches and lbs).',
        inputs: [
            { id: 'load', label: 'Point Load (P)', placeholder: 'e.g. 50', unitMetric: 'kN', unitImperial: 'lbs', type: 'number' },
            { id: 'length', label: 'Span Length (L)', placeholder: 'e.g. 6.0', unitMetric: 'm', unitImperial: 'in', type: 'number' },
            { id: 'elasticity', label: 'Modulus of Elasticity (E)', placeholder: 'e.g. 200', unitMetric: 'GPa', unitImperial: 'psi', type: 'number' },
            { id: 'inertia', label: 'Moment of Inertia (I)', placeholder: 'e.g. 4500', unitMetric: 'cm⁴', unitImperial: 'in⁴', type: 'number' },
        ],
        outputs: [
            { id: 'deflection', label: 'Max Deflection', unitMetric: 'mm', unitImperial: 'in', isPrimary: true },
        ],
        calculate: (inputs, isMetric) => {
            const { load, length, elasticity, inertia } = inputs;
            if (!load || !length || !elasticity || !inertia) return { deflection: '0.00' };

            let defl = 0;
            if (isMetric) {
                const P_N = load * 1000;
                const L_mm = length * 1000;
                const E_Nmm2 = elasticity * 1000;
                const I_mm4 = inertia * 10000;
                defl = (P_N * Math.pow(L_mm, 3)) / (48 * E_Nmm2 * I_mm4);
            } else {
                defl = (load * Math.pow(length, 3)) / (48 * elasticity * inertia);
            }
            return { deflection: defl.toFixed(3) };
        }
    },
    {
        id: 'beam-deflection-uniform',
        name: 'Uniformly Loaded Beam',
        category: 'structural',
        description: 'Deflection for a simply supported beam with a uniform distributed load.',
        iconName: 'Layout',
        referenceText: 'Formula: Δ = (5 * w * L⁴) / (384 * E * I).',
        inputs: [
            { id: 'load', label: 'Uniform Load (w)', placeholder: 'e.g. 10.5', unitMetric: 'kN/m', unitImperial: 'lbs/in', type: 'number' },
            { id: 'length', label: 'Span Length (L)', placeholder: 'e.g. 6.0', unitMetric: 'm', unitImperial: 'in', type: 'number' },
            { id: 'elasticity', label: 'Modulus of Elasticity (E)', placeholder: 'e.g. 200', unitMetric: 'GPa', unitImperial: 'psi', type: 'number' },
            { id: 'inertia', label: 'Moment of Inertia (I)', placeholder: 'e.g. 4500', unitMetric: 'cm⁴', unitImperial: 'in⁴', type: 'number' },
        ],
        outputs: [
            { id: 'deflection', label: 'Max Deflection', unitMetric: 'mm', unitImperial: 'in', isPrimary: true },
        ],
        calculate: (inputs, isMetric) => {
            const { load, length, elasticity, inertia } = inputs;
            if (!load || !length || !elasticity || !inertia) return { deflection: '0.00' };

            let defl = 0;
            if (isMetric) {
                const w_Nmm = load; // kN/m is exactly equivalent to N/mm
                const L_mm = length * 1000;
                const E_Nmm2 = elasticity * 1000;
                const I_mm4 = inertia * 10000;
                defl = (5 * w_Nmm * Math.pow(L_mm, 4)) / (384 * E_Nmm2 * I_mm4);
            } else {
                defl = (5 * load * Math.pow(length, 4)) / (384 * elasticity * inertia);
            }
            return { deflection: defl.toFixed(3) };
        }
    },
    {
        id: 'column-buckling',
        name: 'Euler Column Buckling',
        category: 'structural',
        description: 'Critical buckling load for an ideal, pinned-pinned column.',
        iconName: 'ArrowUpFromLine',
        referenceText: 'P_crit = (π² * E * I) / L²',
        inputs: [
            { id: 'elasticity', label: 'Modulus of Elasticity (E)', placeholder: 'e.g. 200', unitMetric: 'GPa', unitImperial: 'psi', type: 'number' },
            { id: 'inertia', label: 'Moment of Inertia (I)', placeholder: 'e.g. 4500', unitMetric: 'cm⁴', unitImperial: 'in⁴', type: 'number' },
            { id: 'length', label: 'Unbraced Length (L)', placeholder: 'e.g. 3.5', unitMetric: 'm', unitImperial: 'in', type: 'number' },
        ],
        outputs: [
            { id: 'pcrit', label: 'Critical Load', unitMetric: 'kN', unitImperial: 'lbs', isPrimary: true },
        ],
        calculate: (inputs, isMetric) => {
            const { elasticity, inertia, length } = inputs;
            if (!elasticity || !inertia || !length) return { pcrit: '0.00' };

            if (isMetric) {
                const E_Nmm2 = elasticity * 1000;
                const I_mm4 = inertia * 10000;
                const L_mm = length * 1000;
                const P_N = (Math.PI * Math.PI * E_Nmm2 * I_mm4) / Math.pow(L_mm, 2);
                return { pcrit: (P_N / 1000).toFixed(2) };
            } else {
                const pLbs = (Math.PI * Math.PI * elasticity * inertia) / Math.pow(length, 2);
                return { pcrit: pLbs.toFixed(2) };
            }
        }
    },
    {
        id: 'retaining-wall-sliding',
        name: 'Retaining Wall Sliding',
        category: 'geotech',
        description: 'Factor of Safety against sliding for a retaining wall.',
        iconName: 'Container',
        referenceText: 'FS = (Σ Resisting Forces) / (Σ Driving Forces). Standard safe min 1.5.',
        inputs: [
            { id: 'resisting', label: 'Total Resisting Force', placeholder: 'e.g. 150', unitMetric: 'kN', unitImperial: 'lbs', type: 'number' },
            { id: 'driving', label: 'Total Driving Force', placeholder: 'e.g. 80', unitMetric: 'kN', unitImperial: 'lbs', type: 'number' },
        ],
        outputs: [
            { id: 'fs', label: 'Factor of Safety', unitMetric: '', unitImperial: '', isPrimary: true },
            { id: 'status', label: 'Status', unitMetric: '', unitImperial: '', isPrimary: false },
        ],
        calculate: (inputs) => {
            const { resisting, driving } = inputs;
            if (!resisting || !driving || driving === 0) return { fs: '0.00', status: 'N/A' };
            const fs = resisting / driving;
            return {
                fs: fs.toFixed(2),
                status: fs >= 1.5 ? 'SAFE (≥ 1.5)' : 'UNSAFE (< 1.5)'
            };
        }
    },
    {
        id: 'retaining-wall-overturning',
        name: 'Wall Overturning FS',
        category: 'geotech',
        description: 'Factor of Safety against overturning for a retaining wall.',
        iconName: 'RotateCcw',
        referenceText: 'FS = (Σ Resisting Moments) / (Σ Overturning Moments). Standard safe min 2.0.',
        inputs: [
            { id: 'resistingM', label: 'Total Resisting Moment', placeholder: 'e.g. 300', unitMetric: 'kN-m', unitImperial: 'lb-ft', type: 'number' },
            { id: 'drivingM', label: 'Total Overturning Moment', placeholder: 'e.g. 120', unitMetric: 'kN-m', unitImperial: 'lb-ft', type: 'number' },
        ],
        outputs: [
            { id: 'fs', label: 'Factor of Safety', unitMetric: '', unitImperial: '', isPrimary: true },
            { id: 'status', label: 'Status', unitMetric: '', unitImperial: '', isPrimary: false },
        ],
        calculate: (inputs) => {
            const { resistingM, drivingM } = inputs;
            if (!resistingM || !drivingM || drivingM === 0) return { fs: '0.00', status: 'N/A' };
            const fs = resistingM / drivingM;
            return {
                fs: fs.toFixed(2),
                status: fs >= 2.0 ? 'SAFE (≥ 2.0)' : 'UNSAFE (< 2.0)'
            };
        }
    },
    {
        id: 'roof-pitch',
        name: 'Roof Pitch Multiplier',
        category: 'civil',
        description: 'Calculate exact roof surface area from flat plan area using roof pitch.',
        iconName: 'Home',
        referenceText: 'Multiplier = √(1 + (Rise/Run)²). Run is traditionally 12.',
        inputs: [
            { id: 'planArea', label: 'Flat Plan Area', placeholder: 'e.g. 1200', unitMetric: 'm²', unitImperial: 'sq ft', type: 'number' },
            { id: 'rise', label: 'Pitch Rise', placeholder: 'e.g. 4', unitMetric: 'units', unitImperial: 'inches', type: 'number' },
            { id: 'run', label: 'Pitch Run (usually 12)', placeholder: 'e.g. 12', unitMetric: 'units', unitImperial: 'inches', type: 'number' },
        ],
        outputs: [
            { id: 'trueArea', label: 'True Roof Area', unitMetric: 'm²', unitImperial: 'sq ft', isPrimary: true },
            { id: 'multiplier', label: 'Pitch Multiplier', unitMetric: '', unitImperial: '', isPrimary: false },
        ],
        calculate: (inputs) => {
            const { planArea, rise, run } = inputs;
            if (!planArea || !rise || !run || run === 0) return { trueArea: '0.00', multiplier: '0.00' };

            const multiplier = Math.sqrt(1 + Math.pow(rise / run, 2));
            const trueArea = planArea * multiplier;

            return {
                trueArea: trueArea.toFixed(2),
                multiplier: multiplier.toFixed(3)
            };
        }
    },
    {
        id: 'bearing-capacity',
        name: 'Net Safe Bearing Capacity',
        category: 'geotech',
        description: 'Base capacity of soil simply calculated using ultimate bearing and FS.',
        iconName: 'ArrowDown',
        referenceText: 'q_safe = q_ult / FS',
        inputs: [
            { id: 'qult', label: 'Ultimate Bearing Cap.', placeholder: 'e.g. 400', unitMetric: 'kPa', unitImperial: 'psf', type: 'number' },
            { id: 'fs', label: 'Factor of Safety (typ. 3)', placeholder: 'e.g. 3.0', unitMetric: '', unitImperial: '', type: 'number' },
        ],
        outputs: [
            { id: 'qsafe', label: 'Safe Bearing Cap.', unitMetric: 'kPa', unitImperial: 'psf', isPrimary: true },
        ],
        calculate: (inputs) => {
            const { qult, fs } = inputs;
            if (!qult || !fs || fs === 0) return { qsafe: '0.00' };
            return { qsafe: (qult / fs).toFixed(2) };
        }
    },
    {
        id: 'punching-shear',
        name: 'Concrete Punching Shear',
        category: 'structural',
        description: 'Basic 2-way punching shear perimeter estimation (v_c).',
        iconName: 'Box',
        referenceText: 'v_c = 4 * √f\'c * b_o * d (US Customary)',
        inputs: [
            { id: 'fc', label: 'Concrete Strength (f\'c)', placeholder: 'e.g. 28', unitMetric: 'MPa', unitImperial: 'psi', type: 'number' },
            { id: 'bo', label: 'Crit. Perimeter (b_o)', placeholder: 'e.g. 2400', unitMetric: 'mm', unitImperial: 'in', type: 'number' },
            { id: 'd', label: 'Effective Depth (d)', placeholder: 'e.g. 250', unitMetric: 'mm', unitImperial: 'in', type: 'number' },
        ],
        outputs: [
            { id: 'vc', label: 'Shear Capacity (Vc)', unitMetric: 'kN', unitImperial: 'lbs', isPrimary: true },
        ],
        calculate: (inputs, isMetric) => {
            const { fc, bo, d } = inputs;
            if (!fc || !bo || !d) return { vc: '0.00' };

            if (isMetric) {
                // v_c = (1/3) * √fc * b_o * d  (in MPa/mm/N)
                const vcN = (1 / 3) * Math.sqrt(fc) * bo * d;
                return { vc: (vcN / 1000).toFixed(2) };
            } else {
                // v_c = 4 * √fc * b_o * d
                const vcLbs = 4 * Math.sqrt(fc) * bo * d;
                return { vc: vcLbs.toFixed(2) };
            }
        }
    },

    // ==========================================
    // MEP & PLUMBING & HVAC
    // ==========================================
    {
        id: 'pipe-velocity',
        name: 'Liquid Pipe Velocity',
        category: 'plumbing',
        description: 'Calculate fluid velocity inside a pipe based on flow rate and internal diameter.',
        iconName: 'Droplets',
        referenceText: 'V = Q / A. Max recommended velocity for water is typically 5-8 ft/s.',
        inputs: [
            { id: 'flow', label: 'Flow Rate (Q)', placeholder: 'e.g. 5.5', unitMetric: 'L/s', unitImperial: 'GPM', type: 'number' },
            { id: 'diameter', label: 'Internal Diameter (d)', placeholder: 'e.g. 100', unitMetric: 'mm', unitImperial: 'inches', type: 'number' },
        ],
        outputs: [
            { id: 'velocity', label: 'Fluid Velocity', unitMetric: 'm/s', unitImperial: 'ft/s', isPrimary: true },
        ],
        calculate: (inputs, isMetric) => {
            const { flow, diameter } = inputs;
            if (!flow || !diameter || diameter === 0) return { velocity: '0.00' };

            if (isMetric) {
                const Q_m3s = flow / 1000;
                const d_m = diameter / 1000;
                const A_m2 = Math.PI * Math.pow(d_m / 2, 2);
                const V_ms = Q_m3s / A_m2;
                return { velocity: V_ms.toFixed(2) };
            } else {
                const Q_ft3s = flow * 0.002228;
                const d_ft = diameter / 12;
                const A_ft2 = Math.PI * Math.pow(d_ft / 2, 2);
                const V_fts = Q_ft3s / A_ft2;
                return { velocity: V_fts.toFixed(2) };
            }
        }
    },
    {
        id: 'btu-water',
        name: 'Water Heating BTU',
        category: 'hvac',
        description: 'Calculate BTUs required to heat a specific volume of water.',
        iconName: 'Thermometer',
        referenceText: 'BTU = Wait Weight (lbs) × Temp Rise (°F). 1 Gallon of water = 8.33 lbs.',
        inputs: [
            { id: 'volume', label: 'Water Volume', placeholder: 'e.g. 200', unitMetric: 'Liters', unitImperial: 'Gallons', type: 'number' },
            { id: 'tempRise', label: 'Temperature Rise (ΔT)', placeholder: 'e.g. 40', unitMetric: '°C', unitImperial: '°F', type: 'number' },
        ],
        outputs: [
            { id: 'btu', label: 'Required Energy', unitMetric: 'kJ', unitImperial: 'BTU', isPrimary: true },
            { id: 'kw', label: 'Equivalent kWh', unitMetric: 'kWh', unitImperial: 'kWh', isPrimary: false },
        ],
        calculate: (inputs, isMetric) => {
            const { volume, tempRise } = inputs;
            if (!volume || !tempRise) return { btu: '0', kw: '0.00' };

            if (isMetric) {
                const energy_kJ = volume * 4.184 * tempRise;
                const kwh = energy_kJ / 3600;
                return {
                    btu: Math.round(energy_kJ).toLocaleString(),
                    kw: kwh.toFixed(2)
                };
            } else {
                const weightLbs = volume * 8.33;
                const btu = weightLbs * tempRise;
                const kwh = btu / 3412.14;
                return {
                    btu: Math.round(btu).toLocaleString(),
                    kw: kwh.toFixed(2)
                };
            }
        }
    },
    {
        id: 'air-changes',
        name: 'Air Changes per Hour (ACH)',
        category: 'hvac',
        description: 'Determine ACH for a room based on ventilation rate and volume.',
        iconName: 'Wind',
        referenceText: 'ACH = (CFM * 60) / Room Volume',
        inputs: [
            { id: 'cfm', label: 'Air Flow', placeholder: 'e.g. 1200', unitMetric: 'm³/h', unitImperial: 'CFM', type: 'number' },
            { id: 'vol', label: 'Room Volume', placeholder: 'e.g. 150', unitMetric: 'm³', unitImperial: 'Cu Ft', type: 'number' },
        ],
        outputs: [
            { id: 'ach', label: 'Changes per Hour', unitMetric: 'ACH', unitImperial: 'ACH', isPrimary: true },
        ],
        calculate: (inputs, isMetric) => {
            const { cfm, vol } = inputs;
            if (!cfm || !vol || vol === 0) return { ach: '0.00' };

            if (isMetric) {
                // m3/h / m3 = ACH
                return { ach: (cfm / vol).toFixed(2) };
            } else {
                return { ach: ((cfm * 60) / vol).toFixed(2) };
            }
        }
    },
    {
        id: 'motor-hp',
        name: 'Electric Motor HP (3-Phase)',
        category: 'mep',
        description: 'Calculate horsepower of a 3-Phase AC motor.',
        iconName: 'Activity',
        referenceText: 'HP = (V × I × √3 × Eff × PF) / 746',
        inputs: [
            { id: 'v', label: 'Voltage (V)', placeholder: 'e.g. 400', unitMetric: 'Volts', unitImperial: 'Volts', type: 'number' },
            { id: 'i', label: 'Current (A)', placeholder: 'e.g. 35', unitMetric: 'Amps', unitImperial: 'Amps', type: 'number' },
            { id: 'eff', label: 'Efficiency (%)', placeholder: 'e.g. 92', unitMetric: '%', unitImperial: '%', type: 'number' },
            { id: 'pf', label: 'Power Factor (0-1)', placeholder: 'e.g. 0.85', unitMetric: '', unitImperial: '', type: 'number' },
        ],
        outputs: [
            { id: 'hp', label: 'Motor Power', unitMetric: 'HP', unitImperial: 'HP', isPrimary: true },
            { id: 'kw', label: 'Power in kW', unitMetric: 'kW', unitImperial: 'kW', isPrimary: false },
        ],
        calculate: (inputs) => {
            const { v, i, eff, pf } = inputs;
            if (!v || !i) return { hp: '0.00', kw: '0.00' };

            const pFact = pf || 0.85; // default 0.85
            const efficiency = eff ? (eff / 100) : 0.90;

            const watts = v * i * Math.sqrt(3) * pFact * efficiency;
            const hp = watts / 746;

            return {
                hp: hp.toFixed(2),
                kw: (watts / 1000).toFixed(2)
            };
        }
    },

    // ==========================================
    // FINANCIAL & PRODUCTIVITY
    // ==========================================
    {
        id: 'roi-calculator',
        name: 'Equipment ROI',
        category: 'financial',
        description: 'Calculate Return on Investment (ROI) and Payback Period for new equipment.',
        iconName: 'TrendingUp',
        referenceText: 'ROI = (Net Profit / Cost of Investment) * 100',
        inputs: [
            { id: 'cost', label: 'Equipment Cost', placeholder: 'e.g. 150000', unitMetric: '$', unitImperial: '$', type: 'number' },
            { id: 'annualSavings', label: 'Annual Savings/Revenue', placeholder: 'e.g. 45000', unitMetric: '$', unitImperial: '$', type: 'number' },
            { id: 'annualMaint', label: 'Annual Maintenance Cost', placeholder: 'e.g. 5000', unitMetric: '$', unitImperial: '$', type: 'number' },
        ],
        outputs: [
            { id: 'roi', label: 'Annual ROI', unitMetric: '%', unitImperial: '%', isPrimary: true },
            { id: 'payback', label: 'Payback Period', unitMetric: 'Years', unitImperial: 'Years', isPrimary: false },
        ],
        calculate: (inputs) => {
            const { cost, annualSavings, annualMaint } = inputs;
            if (!cost || !annualSavings) return { roi: '0.00', payback: '0.0' };

            const maint = annualMaint || 0;
            const netAnnual = annualSavings - maint;

            if (netAnnual <= 0) return { roi: '0.00', payback: 'Never' };

            const roi = (netAnnual / cost) * 100;
            const payback = cost / netAnnual;

            return {
                roi: roi.toFixed(2),
                payback: payback.toFixed(1)
            };
        }
    },
    {
        id: 'markup-margin',
        name: 'Markup vs Margin',
        category: 'financial',
        description: 'Calculate sale price using either Markup (%) or Margin (%).',
        iconName: 'Percent',
        referenceText: 'Margin is based on Sales Price. Markup is based on Cost.',
        inputs: [
            { id: 'cost', label: 'Item/Job Cost', placeholder: 'e.g. 5000', unitMetric: '$', unitImperial: '$', type: 'number' },
            { id: 'percentage', label: 'Percentage (%)', placeholder: 'e.g. 25', unitMetric: '%', unitImperial: '%', type: 'number' },
        ],
        outputs: [
            { id: 'priceMargin', label: 'Price (as Margin)', unitMetric: '$', unitImperial: '$', isPrimary: true },
            { id: 'priceMarkup', label: 'Price (as Markup)', unitMetric: '$', unitImperial: '$', isPrimary: false },
        ],
        calculate: (inputs) => {
            const { cost, percentage } = inputs;
            if (!cost || !percentage) return { priceMargin: '0.00', priceMarkup: '0.00' };

            const dec = percentage / 100;

            // Markup = Cost * (1 + MarkupDec)
            const prcMarkup = cost * (1 + dec);

            // Margin = Cost / (1 - MarginDec)
            let prcMargin = 0;
            if (dec < 1) {
                prcMargin = cost / (1 - dec);
            }

            return {
                priceMargin: prcMargin ? prcMargin.toFixed(2) : 'Error',
                priceMarkup: prcMarkup.toFixed(2)
            };
        }
    },
    {
        id: 'borrow-pit-volume',
        name: 'Borrow Pit Volume',
        category: 'civil',
        description: 'Volume of soil needed from borrow pit accounting for Shrinkage/Swell.',
        iconName: 'Mountain',
        referenceText: 'Bank Vol = Compacted Vol / (1 - Shrinkage%)',
        inputs: [
            { id: 'compacted', label: 'Required Compacted Vol', placeholder: 'e.g. 1000', unitMetric: 'm³', unitImperial: 'yd³', type: 'number' },
            { id: 'shrink', label: 'Shrinkage (%)', placeholder: 'e.g. 15', unitMetric: '%', unitImperial: '%', type: 'number' },
            { id: 'swell', label: 'Swell (%) for Haul', placeholder: 'e.g. 20', unitMetric: '%', unitImperial: '%', type: 'number' },
        ],
        outputs: [
            { id: 'bank', label: 'Bank Volume Required', unitMetric: 'm³', unitImperial: 'yd³', isPrimary: true },
            { id: 'loose', label: 'Loose Haul Volume', unitMetric: 'm³', unitImperial: 'yd³', isPrimary: false },
        ],
        calculate: (inputs) => {
            const { compacted, shrink, swell } = inputs;
            if (!compacted || !shrink) return { bank: '0.00', loose: '0.00' };

            const bank = compacted / (1 - (shrink / 100));

            let loose = bank;
            if (swell) {
                loose = bank * (1 + (swell / 100));
            }

            return {
                bank: bank.toFixed(2),
                loose: loose.toFixed(2)
            };
        }
    },
    {
        id: 'paver-blocks',
        name: 'Paver Block Estimator',
        category: 'civil',
        description: 'Number of paving blocks required for a surface area.',
        iconName: 'LayoutGrid',
        referenceText: 'Accounts for a 5% breakage waste allowance.',
        inputs: [
            { id: 'area', label: 'Paving Area', placeholder: 'e.g. 500', unitMetric: 'm²', unitImperial: 'ft²', type: 'number' },
            { id: 'l', label: 'Paver Length', placeholder: 'e.g. 200', unitMetric: 'mm', unitImperial: 'inches', type: 'number' },
            { id: 'w', label: 'Paver Width', placeholder: 'e.g. 100', unitMetric: 'mm', unitImperial: 'inches', type: 'number' },
        ],
        outputs: [
            { id: 'blocks', label: 'Total Blocks (+5% Waste)', unitMetric: 'blocks', unitImperial: 'blocks', isPrimary: true },
        ],
        calculate: (inputs, isMetric) => {
            const { area, l, w } = inputs;
            if (!area || !l || !w || l === 0 || w === 0) return { blocks: '0' };

            let paverArea = 0;
            if (isMetric) {
                paverArea = (l / 1000) * (w / 1000); // m2
            } else {
                paverArea = (l / 12) * (w / 12); // ft2
            }

            const total = (area / paverArea) * 1.05; // 5% waste
            return { blocks: Math.ceil(total).toString() };
        }
    },
    {
        id: 'trench-volume',
        name: 'Trench Volume / Pipe Bedding',
        category: 'civil',
        description: 'Calculate excavation vol and pipe bedding material vol.',
        iconName: 'AlignVerticalSpaceAround',
        referenceText: 'Excavation = L × W × D. Bedding deducts pipe volume.',
        inputs: [
            { id: 'l', label: 'Trench Length', placeholder: 'e.g. 150', unitMetric: 'm', unitImperial: 'ft', type: 'number' },
            { id: 'w', label: 'Trench Width', placeholder: 'e.g. 1.2', unitMetric: 'm', unitImperial: 'ft', type: 'number' },
            { id: 'd', label: 'Trench Depth', placeholder: 'e.g. 2.0', unitMetric: 'm', unitImperial: 'ft', type: 'number' },
            { id: 'beddingD', label: 'Bedding Depth', placeholder: 'e.g. 0.3', unitMetric: 'm', unitImperial: 'ft', type: 'number' },
            { id: 'pipeOut', label: 'Pipe Outer Diameter', placeholder: 'e.g. 300', unitMetric: 'mm', unitImperial: 'inches', type: 'number' },
        ],
        outputs: [
            { id: 'excavation', label: 'Excavation Vol', unitMetric: 'm³', unitImperial: 'yd³', isPrimary: true },
            { id: 'bedding', label: 'Bedding Vol', unitMetric: 'm³', unitImperial: 'yd³', isPrimary: false },
        ],
        calculate: (inputs, isMetric) => {
            const { l, w, d, beddingD, pipeOut } = inputs;
            if (!l || !w || !d) return { excavation: '0.00', bedding: '0.00' };

            let exc = l * w * d;
            let bed = 0;

            if (beddingD && pipeOut) {
                let pDia = isMetric ? pipeOut / 1000 : pipeOut / 12;
                let pVol = Math.PI * Math.pow(pDia / 2, 2) * l;
                bed = (l * w * beddingD) - (pVol * 0.5); // assume pipe gets bedded up to springline
                if (bed < 0) bed = 0;
            }

            if (!isMetric) {
                exc = exc / 27;
                bed = bed / 27;
            }

            return {
                excavation: exc.toFixed(2),
                bedding: bed.toFixed(2)
            };
        }
    },
    {
        id: 'wind-load-base',
        name: 'Base Wind Pressure',
        category: 'structural',
        description: 'Calculate baseline wind velocity pressure based on exposure category.',
        iconName: 'Wind',
        referenceText: 'qz = 0.00256 * Kz * Kzt * Kd * V² (ASCE 7 Simplified).',
        inputs: [
            { id: 'velocity', label: 'Basic Wind Speed (V)', placeholder: 'e.g. 115', unitMetric: 'm/s', unitImperial: 'mph', type: 'number' },
            {
                id: 'exposure',
                label: 'Exposure Category',
                type: 'select',
                options: [
                    { label: 'Exp B (Urban)', value: '0.7' },
                    { label: 'Exp C (Open)', value: '0.85' },
                    { label: 'Exp D (Coastal)', value: '1.03' }
                ]
            }
        ],
        outputs: [
            { id: 'qz', label: 'Velocity Pressure (qz)', unitMetric: 'kPa', unitImperial: 'psf', isPrimary: true },
        ],
        calculate: (inputs, isMetric) => {
            const { velocity, exposure } = inputs;
            if (!velocity || isNaN(exposure)) return { qz: '0.00' };

            // Simplified standard calculation
            if (isMetric) {
                // qz = 0.613 * Kz * V^2 (V in m/s, qz in N/m2)
                const qz_Pa = 0.613 * exposure * Math.pow(velocity, 2);
                return { qz: (qz_Pa / 1000).toFixed(2) };
            } else {
                // qz = 0.00256 * Kz * V^2
                const qz_psf = 0.00256 * exposure * Math.pow(velocity, 2);
                return { qz: qz_psf.toFixed(2) };
            }
        }
    },
    {
        id: 'concrete-mix',
        name: 'Concrete Mix Ingredients',
        category: 'civil',
        description: 'Estimate bags of cement, sand, and aggregate needed for a specific concrete grade.',
        iconName: 'Layers',
        referenceText: 'Based on standard nominal mix proportions (Cement : Sand : Aggregate).',
        inputs: [
            { id: 'volume', label: 'Total Wet Volume Needed', placeholder: 'e.g. 5', unitMetric: 'm³', unitImperial: 'yd³', type: 'number' },
            {
                id: 'grade',
                label: 'Concrete Grade Mix',
                type: 'select',
                options: [
                    { label: 'M15 (1:2:4)', value: '1' },
                    { label: 'M20 (1:1.5:3)', value: '2' },
                    { label: 'M25 (1:1:2)', value: '3' }
                ]
            }
        ],
        outputs: [
            { id: 'cement', label: 'Cement (50kg Bags)', unitMetric: 'Bags', unitImperial: 'Bags', isPrimary: true },
            { id: 'sand', label: 'Sand Volume', unitMetric: 'm³', unitImperial: 'yd³', isPrimary: false },
            { id: 'agg', label: 'Aggregate Volume', unitMetric: 'm³', unitImperial: 'yd³', isPrimary: false },
        ],
        calculate: (inputs, isMetric) => {
            const { volume, grade } = inputs;
            if (!volume || isNaN(grade)) return { cement: '0', sand: '0.00', agg: '0.00' };

            // 1 = M15 (1:2:4)
            // 2 = M20 (1:1.5:3)
            // 3 = M25 (1:1:2)
            let c = 1, s = 2, a = 4, total = 7;
            if (grade === 2) { s = 1.5; a = 3; total = 5.5; }
            if (grade === 3) { s = 1; a = 2; total = 4; }

            // Dry volume of concrete is ~1.54 times wet volume
            let v_m3 = isMetric ? volume : (volume * 0.764555); // convert yd3 to m3 for calculation
            const dry_m3 = v_m3 * 1.54;

            const cem_m3 = dry_m3 * (c / total);
            const sand_m3 = dry_m3 * (s / total);
            const agg_m3 = dry_m3 * (a / total);

            // 1 m3 cement roughly = 1440 kg. 1 bag = 50kg.
            const bags = (cem_m3 * 1440) / 50;

            if (isMetric) {
                return {
                    cement: Math.ceil(bags).toString(),
                    sand: sand_m3.toFixed(2),
                    agg: agg_m3.toFixed(2)
                };
            } else {
                return {
                    cement: Math.ceil(bags).toString(), // Bags are universal unit 
                    sand: (sand_m3 / 0.764555).toFixed(2), // convert back to yd3
                    agg: (agg_m3 / 0.764555).toFixed(2)
                };
            }
        }
    },
    {
        id: 'live-load',
        name: 'Live Load Estimator',
        category: 'structural',
        description: 'Minimum uniformly distributed live loads based on ASCE 7 / IBC occupancies.',
        iconName: 'Users',
        referenceText: 'Standard minimum design loads for building floors.',
        inputs: [
            { id: 'area', label: 'Floor Area', placeholder: 'e.g. 1500', unitMetric: 'm²', unitImperial: 'ft²', type: 'number' },
            {
                id: 'occupancy',
                label: 'Room Occupancy Type',
                type: 'select',
                options: [
                    { label: 'Residential (Rooms)', value: '40' },
                    { label: 'Office Use', value: '50' },
                    { label: 'Public Assembly', value: '100' },
                    { label: 'Light Storage', value: '125' }
                ]
            }
        ],
        outputs: [
            { id: 'totalLoad', label: 'Total Live Load', unitMetric: 'kN', unitImperial: 'lbs', isPrimary: true },
            { id: 'psfLoad', label: 'Design Uniform Load', unitMetric: 'kPa', unitImperial: 'psf', isPrimary: false },
        ],
        calculate: (inputs, isMetric) => {
            const { area, occupancy } = inputs;
            if (!area || isNaN(occupancy)) return { totalLoad: '0', psfLoad: '0' };

            // occupancy value is in PSF (lbs/ft^2)
            let load_psf = occupancy;

            if (isMetric) {
                // Convert PSF to kPa: 1 PSF = 0.04788 kPa
                const load_kPa = load_psf * 0.04788;
                const total_kN = area * load_kPa;
                return {
                    totalLoad: Math.round(total_kN).toLocaleString(),
                    psfLoad: load_kPa.toFixed(2)
                };
            } else {
                const total_lbs = area * load_psf;
                return {
                    totalLoad: Math.round(total_lbs).toLocaleString(),
                    psfLoad: load_psf.toString()
                };
            }
        }
    },
    {
        id: 'paint-estimator',
        name: 'Paint Area Estimator',
        category: 'civil',
        description: 'Calculate paint gallons/liters needed for wall and ceiling areas.',
        iconName: 'Droplet',
        referenceText: 'Assumes standard coverage (e.g. 350 sq.ft/gal or 10 m²/L) and 2 coats.',
        inputs: [
            { id: 'area', label: 'Total Surface Area', placeholder: 'e.g. 1200', unitMetric: 'm²', unitImperial: 'ft²', type: 'number' },
            { id: 'coats', label: 'Number of Coats', placeholder: 'e.g. 2', unitMetric: '', unitImperial: '', type: 'number' },
            {
                id: 'coverage',
                label: 'Paint Coverage per Unit',
                type: 'select',
                options: [
                    { label: 'Standard (10 m²/L | 400 ft²/gal)', value: '1' },
                    { label: 'Primer (8 m²/L | 300 ft²/gal)', value: '2' },
                    { label: 'Thick/Textured (6 m²/L | 200 ft²/gal)', value: '3' }
                ]
            }
        ],
        outputs: [
            { id: 'paint', label: 'Required Paint volume', unitMetric: 'Liters', unitImperial: 'Gallons', isPrimary: true },
        ],
        calculate: (inputs, isMetric) => {
            const { area, coats, coverage } = inputs;
            if (!area || !coats || isNaN(coverage)) return { paint: '0' };

            let cRate = 10; // m2/L
            if (!isMetric) cRate = 400; // ft2/gal

            if (coverage === 2) cRate = isMetric ? 8 : 300;
            if (coverage === 3) cRate = isMetric ? 6 : 200;

            const total = (area / cRate) * coats;
            return { paint: Math.ceil(total).toString() }; // Usually buy whole gallons/liters
        }
    },
    {
        id: 'drywall-sheets',
        name: 'Drywall/Plasterboard Estimator',
        category: 'civil',
        description: 'Estimate total drywall sheets required for a given area including a 10% waste factor.',
        iconName: 'Layers',
        referenceText: 'Standard sheet: 4x8 ft (32 sq.ft) or 1.2x2.4 m (2.88 m²).',
        inputs: [
            { id: 'area', label: 'Wall/Ceiling Area', placeholder: 'e.g. 800', unitMetric: 'm²', unitImperial: 'ft²', type: 'number' },
        ],
        outputs: [
            { id: 'sheets', label: 'Total Sheets (inc. 10% Waste)', unitMetric: 'Sheets', unitImperial: 'Sheets', isPrimary: true },
        ],
        calculate: (inputs, isMetric) => {
            const { area } = inputs;
            if (!area) return { sheets: '0' };
            const sheetArea = isMetric ? 2.88 : 32;
            const sheets = (area / sheetArea) * 1.10; // 10% waste
            return { sheets: Math.ceil(sheets).toString() };
        }
    },
    {
        id: 'stud-framing',
        name: 'Wall Stud Framing Estimator',
        category: 'civil',
        description: 'Estimate lumber studs required based on wall length and spacing.',
        iconName: 'LayoutGrid',
        referenceText: 'Formula: (Length / Spacing) + 1, plus additional for corners and plates.',
        inputs: [
            { id: 'length', label: 'Total Wall Length', placeholder: 'e.g. 50', unitMetric: 'm', unitImperial: 'ft', type: 'number' },
            {
                id: 'spacing',
                label: 'Stud Spacing (O.C.)',
                type: 'select',
                options: [
                    { label: '16 inches (400 mm)', value: '1' },
                    { label: '24 inches (600 mm)', value: '2' }
                ]
            }
        ],
        outputs: [
            { id: 'studs', label: 'Est. Vertical Studs', unitMetric: 'Count', unitImperial: 'Count', isPrimary: true },
            { id: 'plates', label: 'Top & Bottom Plates (Length)', unitMetric: 'm', unitImperial: 'ft', isPrimary: false },
        ],
        calculate: (inputs, isMetric) => {
            const { length, spacing } = inputs;
            if (!length || isNaN(spacing)) return { studs: '0', plates: '0' };

            const space = spacing === 1 ? (isMetric ? 0.4 : 1.333) : (isMetric ? 0.6 : 2.0);
            let studs = Math.ceil(length / space) + 1;

            // Add 10% for waste, corners, doors
            studs = Math.ceil(studs * 1.15);
            const plates = length * 3; // Double top, single bottom

            return {
                studs: studs.toString(),
                plates: plates.toFixed(1)
            };
        }
    },
    {
        id: 'pipe-volume',
        name: 'Internal Pipe Capacity',
        category: 'mep',
        description: 'Calculate fluid volume capacity within a length of pipe.',
        iconName: 'Droplet',
        referenceText: 'Volume = Area × Length = (π × D² / 4) × L.',
        inputs: [
            { id: 'diameter', label: 'Inner Diameter', placeholder: 'e.g. 150', unitMetric: 'mm', unitImperial: 'inches', type: 'number' },
            { id: 'length', label: 'Pipe Length', placeholder: 'e.g. 50', unitMetric: 'm', unitImperial: 'ft', type: 'number' },
        ],
        outputs: [
            { id: 'vol', label: 'Fluid Capacity', unitMetric: 'Liters', unitImperial: 'Gallons', isPrimary: true },
        ],
        calculate: (inputs, isMetric) => {
            const { diameter, length } = inputs;
            if (!diameter || !length) return { vol: '0.00' };

            let d = diameter;
            if (isMetric) {
                const area_m2 = Math.PI * Math.pow(d / 1000, 2) / 4;
                const vol_m3 = area_m2 * length;
                return { vol: (vol_m3 * 1000).toFixed(2) }; // Liters
            } else {
                const area_ft2 = Math.PI * Math.pow(d / 12, 2) / 4;
                const vol_ft3 = area_ft2 * length;
                return { vol: (vol_ft3 * 7.48052).toFixed(2) }; // US Gallons
            }
        }
    },
    {
        id: 'ohms-law',
        name: 'Ohm\'s Law Calculator',
        category: 'mep',
        description: 'Calculate Voltage, Current, Resistance, or Power.',
        iconName: 'Zap',
        referenceText: 'V = I × R, P = V × I',
        inputs: [
            { id: 'v', label: 'Voltage (V)', placeholder: 'e.g. 120 (Leave blank to solve)', unitMetric: 'V', unitImperial: 'V', type: 'number' },
            { id: 'i', label: 'Current (I)', placeholder: 'e.g. 15 (Leave blank to solve)', unitMetric: 'A', unitImperial: 'A', type: 'number' },
            { id: 'r', label: 'Resistance (R)', placeholder: 'e.g. 8 (Leave blank to solve)', unitMetric: 'Ω', unitImperial: 'Ω', type: 'number' },
        ],
        outputs: [
            { id: 'resV', label: 'Voltage', unitMetric: 'V', unitImperial: 'V', isPrimary: true },
            { id: 'resI', label: 'Current', unitMetric: 'A', unitImperial: 'A', isPrimary: false },
            { id: 'resR', label: 'Resistance', unitMetric: 'Ω', unitImperial: 'Ω', isPrimary: false },
            { id: 'resP', label: 'Power', unitMetric: 'W', unitImperial: 'W', isPrimary: false },
        ],
        calculate: (inputs) => {
            const v = inputs.v || 0;
            const i = inputs.i || 0;
            const r = inputs.r || 0;

            let solvedV = v, solvedI = i, solvedR = r;

            if (v && i && !r) solvedR = v / i;
            else if (v && r && !i) solvedI = v / r;
            else if (i && r && !v) solvedV = i * r;

            const p = solvedV * solvedI;

            if (!solvedV && !solvedI && !solvedR) return { resV: '0', resI: '0', resR: '0', resP: '0' };

            return {
                resV: solvedV.toFixed(2),
                resI: solvedI.toFixed(2),
                resR: solvedR.toFixed(2),
                resP: p.toFixed(2)
            };
        }
    },
    {
        id: 'ac-tonnage',
        name: 'AC Unit Sizing (Cooling Load)',
        category: 'mep',
        description: 'Rough estimate of Air Conditioning tonnage required based on room area.',
        iconName: 'Wind',
        referenceText: 'Rule of thumb: 20 BTU per sq.ft., or 1 Ton = 12,000 BTU.',
        inputs: [
            { id: 'area', label: 'Room Area', placeholder: 'e.g. 600', unitMetric: 'm²', unitImperial: 'ft²', type: 'number' },
            {
                id: 'insulation',
                label: 'Insulation & Sun',
                type: 'select',
                options: [
                    { label: 'Normal / Good Insulation', value: '1' },
                    { label: 'Poor Insulation / High Sun', value: '1.2' },
                    { label: 'Kitchen / Many Occupants', value: '1.4' }
                ]
            }
        ],
        outputs: [
            { id: 'tons', label: 'Recommended AC Size', unitMetric: 'Tons', unitImperial: 'Tons', isPrimary: true },
            { id: 'btu', label: 'Cooling Load', unitMetric: 'BTU/hr', unitImperial: 'BTU/hr', isPrimary: false },
        ],
        calculate: (inputs, isMetric) => {
            const { area, insulation } = inputs;
            if (!area || isNaN(insulation)) return { tons: '0', btu: '0' };

            // Convert to sqft if metric
            const sqft = isMetric ? area * 10.7639 : area;

            // Base 20 BTU per sqft * modifier
            const btu = sqft * 20 * insulation;
            const tons = btu / 12000;

            return {
                tons: (Math.ceil(tons * 2) / 2).toFixed(1), // Round to nearest 0.5 ton
                btu: Math.round(btu).toLocaleString()
            };
        }
    },
    {
        id: 'moisture-content',
        name: 'Soil Moisture Content',
        category: 'geotech',
        description: 'Calculate the percentage of water weight to soil solids weight.',
        iconName: 'Droplets',
        referenceText: 'w(%) = (Weight of Water / Weight of Dry Soil) × 100',
        inputs: [
            { id: 'wet', label: 'Mass of Wet Soil', placeholder: 'e.g. 150', unitMetric: 'g', unitImperial: 'oz', type: 'number' },
            { id: 'dry', label: 'Mass of Dry Soil', placeholder: 'e.g. 125', unitMetric: 'g', unitImperial: 'oz', type: 'number' },
        ],
        outputs: [
            { id: 'mc', label: 'Moisture Content', unitMetric: '%', unitImperial: '%', isPrimary: true },
            { id: 'water', label: 'Mass of Water', unitMetric: 'g', unitImperial: 'oz', isPrimary: false },
        ],
        calculate: (inputs) => {
            const { wet, dry } = inputs;
            if (!wet || !dry || dry >= wet || dry === 0) return { mc: '0.00', water: '0.00' };

            const waterMass = wet - dry;
            const mc = (waterMass / dry) * 100;

            return {
                mc: mc.toFixed(2),
                water: waterMass.toFixed(2)
            };
        }
    },
    {
        id: 'void-ratio',
        name: 'Soil Void Ratio & Porosity',
        category: 'geotech',
        description: 'Calculate fundamental geotech volumetric relationships.',
        iconName: 'Box',
        referenceText: 'Void Ratio (e) = Vv / Vs. Porosity (n) = Vv / Vtotal.',
        inputs: [
            { id: 'vtotal', label: 'Total Volume (V)', placeholder: 'e.g. 100', unitMetric: 'cm³', unitImperial: 'in³', type: 'number' },
            { id: 'vsolids', label: 'Volume of Solids (Vs)', placeholder: 'e.g. 60', unitMetric: 'cm³', unitImperial: 'in³', type: 'number' },
        ],
        outputs: [
            { id: 'e', label: 'Void Ratio (e)', unitMetric: '', unitImperial: '', isPrimary: true },
            { id: 'n', label: 'Porosity (n)', unitMetric: '%', unitImperial: '%', isPrimary: false },
        ],
        calculate: (inputs) => {
            const { vtotal, vsolids } = inputs;
            if (!vtotal || !vsolids || vsolids >= vtotal || vsolids === 0) return { e: '0.00', n: '0.00' };

            const vvoids = vtotal - vsolids;
            const e = vvoids / vsolids;
            const n = (vvoids / vtotal) * 100;

            return {
                e: e.toFixed(3),
                n: n.toFixed(2)
            };
        }
    },
    {
        id: 'loan-payment',
        name: 'Equipment Loan Amortization',
        category: 'financial',
        description: 'Calculate monthly payments for capital construction equipment purchases.',
        iconName: 'DollarSign',
        referenceText: 'EMI = P × r × (1+r)^n / ((1+r)^n - 1)',
        inputs: [
            { id: 'principal', label: 'Loan Amount (P)', placeholder: 'e.g. 50000', unitMetric: '$', unitImperial: '$', type: 'number' },
            { id: 'rate', label: 'Annual Interest Rate', placeholder: 'e.g. 6.5', unitMetric: '%', unitImperial: '%', type: 'number' },
            { id: 'years', label: 'Loan Term', placeholder: 'e.g. 5', unitMetric: 'Years', unitImperial: 'Years', type: 'number' },
        ],
        outputs: [
            { id: 'emi', label: 'Monthly Payment', unitMetric: '$ / mo', unitImperial: '$ / mo', isPrimary: true },
            { id: 'totalInt', label: 'Total Interest Paid', unitMetric: '$', unitImperial: '$', isPrimary: false },
        ],
        calculate: (inputs) => {
            const { principal, rate, years } = inputs;
            if (!principal || !rate || !years) return { emi: '0.00', totalInt: '0.00' };

            const r = (rate / 100) / 12; // monthly rate
            const n = years * 12; // total months

            const emi = principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
            const totalRepayment = emi * n;
            const totalInt = totalRepayment - principal;

            return {
                emi: emi.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ","),
                totalInt: totalInt.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
            };
        }
    },
    {
        id: 'rent-vs-buy',
        name: 'Equipment Rent vs Buy',
        category: 'financial',
        description: 'Determine the break-even point in periods for renting vs buying equipment.',
        iconName: 'TrendingUp',
        referenceText: 'Break Even = (Purchase Cost - Resale) / (Rental Cost - Operating Cost)',
        inputs: [
            { id: 'purchase', label: 'Purchase Price', placeholder: 'e.g. 120000', unitMetric: '$', unitImperial: '$', type: 'number' },
            { id: 'resale', label: 'Est. Resale/Salvage Value', placeholder: 'e.g. 40000', unitMetric: '$', unitImperial: '$', type: 'number' },
            { id: 'rent', label: 'Rental Cost (Per Month)', placeholder: 'e.g. 3500', unitMetric: '$ / mo', unitImperial: '$ / mo', type: 'number' },
            { id: 'maint', label: 'Ownership Maint. (Per Month)', placeholder: 'e.g. 400', unitMetric: '$ / mo', unitImperial: '$ / mo', type: 'number' },
        ],
        outputs: [
            { id: 'months', label: 'Break Even Point', unitMetric: 'Months', unitImperial: 'Months', isPrimary: true },
        ],
        calculate: (inputs) => {
            const { purchase, resale, rent, maint } = inputs;
            if (!purchase || !rent) return { months: '0.0' };

            // Ownership net cost = Purchase - Resale + (Maint * x)
            // Rental cost = Rent * x
            // Purchase - Resale = (Rent - Maint) * x
            // x = (Purchase - Resale) / (Rent - Maint)

            const effectiveRent = rent - (maint || 0);
            if (effectiveRent <= 0) return { months: 'Never' };

            const costGap = purchase - (resale || 0);
            const breakEven = costGap / effectiveRent;

            return {
                months: breakEven.toFixed(1)
            };
        }
    },
    {
        id: 'crew-productivity',
        name: 'Crew Productivity Rate',
        category: 'productivity',
        description: 'Calculate unit production rate and total duration for a task.',
        iconName: 'Activity',
        referenceText: 'Productivity = Total Units / (Crew Size × Duration)',
        inputs: [
            { id: 'units', label: 'Total Planned Units', placeholder: 'e.g. 500', unitMetric: '', unitImperial: '', type: 'number' },
            { id: 'daily', label: 'Daily Output (Units/Day)', placeholder: 'e.g. 45', unitMetric: 'Units/Day', unitImperial: 'Units/Day', type: 'number' },
            { id: 'crew', label: 'Crew Size', placeholder: 'e.g. 5', unitMetric: 'Workers', unitImperial: 'Workers', type: 'number' },
        ],
        outputs: [
            { id: 'days', label: 'Total Duration', unitMetric: 'Days', unitImperial: 'Days', isPrimary: true },
            { id: 'rate', label: 'Output per Worker', unitMetric: 'Units/Day', unitImperial: 'Units/Day', isPrimary: false },
        ],
        calculate: (inputs) => {
            const { units, daily, crew } = inputs;
            if (!units || !daily) return { days: '0', rate: '0.00' };

            const days = units / daily;
            const rate = crew > 0 ? daily / crew : 0;

            return {
                days: Math.ceil(days).toString(),
                rate: rate.toFixed(1)
            };
        }
    },
    {
        id: 'bending-moment',
        name: 'Max Bending Moment (Uniform)',
        category: 'structural',
        description: 'Max moment for simply supported beam with uniform load.',
        iconName: 'Minus',
        referenceText: 'Mmax = wL² / 8 (occurring at mid-span).',
        inputs: [
            { id: 'load', label: 'Uniform Load (w)', placeholder: 'e.g. 10', unitMetric: 'kN/m', unitImperial: 'klf', type: 'number' },
            { id: 'span', label: 'Beam Span (L)', placeholder: 'e.g. 6', unitMetric: 'm', unitImperial: 'ft', type: 'number' },
        ],
        outputs: [
            { id: 'moment', label: 'Maximum Moment', unitMetric: 'kN-m', unitImperial: 'kip-ft', isPrimary: true },
            { id: 'reaction', label: 'End Reaction', unitMetric: 'kN', unitImperial: 'kips', isPrimary: false },
        ],
        calculate: (inputs) => {
            const { load, span } = inputs;
            if (!load || !span) return { moment: '0.00', reaction: '0.00' };

            const m = (load * Math.pow(span, 2)) / 8;
            const r = (load * span) / 2;

            return {
                moment: m.toFixed(2),
                reaction: r.toFixed(2)
            };
        }
    }
];
