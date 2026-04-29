import { notes } from '@/lib/db/pg-schema';
import type { ProfileResult } from './profile';

interface NoteSeed {
  title: string;
  color: 'white' | 'pink' | 'yellow' | 'blue' | 'green';
  noteDate: string;
  isStarred?: boolean;
  content: string;
}

// Long content blocks live as constants for readability
const NOTES: NoteSeed[] = [
  // ============================================================
  // WHITE / NOTICES (6)
  // ============================================================
  {
    title: 'Council notice — out-of-hours work approval (CN-001)',
    color: 'white',
    noteDate: '2026-01-14',
    content:
      'City of Parramatta Council has issued conditional approval for out-of-hours concrete pours covering L1, L2 and L3 slab activities. Approved hours: Saturday 7am–3pm, with prior 48hr notice to neighbouring properties. Conditions: noise monitoring at 12 Burroway Road boundary, restricted truck movements before 8am, and a pre-pour notification to the strata committees of adjoining apartment buildings. ADCO to coordinate notifications and provide weekly compliance log to the Project Manager. Reference: Council file CON-2026-014.',
  },
  {
    title: 'Latent condition notice — rock encountered (CN-002)',
    color: 'white',
    noteDate: '2025-11-19',
    content:
      'During bulk excavation, ADCO has encountered hard sandstone bedrock at RL -3.8 across the southern third of the site. JK Geotechnics inspected on 18 Nov and confirmed material exceeds the design assumption (medium-dense sand to RL -5.2). Latent condition notice issued under Clause 25.2 of AS 4902. Estimated additional excavation cost: $42k. Estimated time impact: 3 days (assessed under EOT #2). Awaiting QS review and Owner approval before instructing the variation.',
  },
  {
    title: 'Defect notice — basement waterproofing patch (CN-003)',
    color: 'white',
    noteDate: '2026-02-26',
    content:
      'Independent inspector (Cooke & Dowsett representative) identified 3no. localised waterproofing failures in the basement perimeter wall — northern boundary, between grids 4–5 and 6–7. Membrane lifting at construction joint. ADCO to remediate per the original specification (Sika SikaProof) and re-test before backfilling. Defect notice issued; remediation to be complete by 12 March. No cost impact (within head contract scope).',
  },
  {
    title: 'Service interruption notice — Ausgrid substation tie-in (CN-004)',
    color: 'white',
    noteDate: '2026-04-21',
    content:
      'Ausgrid has confirmed the substation tie-in for 28 April 2026 (next Tuesday). Power to the site will be interrupted from 7am to 3pm. ADCO to coordinate with all subcontractors — no concrete pours, no welding, no lift testing during the window. Generator hire arranged for site office and security lighting. Notifications issued to all neighbouring properties on 18 April per Council requirement.',
  },
  {
    title: 'Notice of suspected polluted material (CN-005)',
    color: 'white',
    noteDate: '2025-11-04',
    content:
      'During initial demolition, ADCO observed potentially contaminated fill in the south-west corner of the site (approximately 8m³). Material exhibits hydrocarbon staining. Stockpile cordoned off and Environmental Consultant engaged for testing under POEO Act 1997. Awaiting laboratory results (expected 12 Nov) before classifying as general solid waste, restricted solid waste, or hazardous waste. Disposal cost variance dependent on classification.',
  },
  {
    title: 'WHS notice — scaffold inspection overdue (CN-006)',
    color: 'white',
    noteDate: '2026-02-10',
    content:
      'During routine site walk, the PM identified that the scaffold inspection log on the eastern facade had not been signed off in the past 14 days (last entry 25 Jan). SafeWork NSW requirement is 7-day inspection minimum. ADCO scaffolder (Layher) attended same-day and completed the inspection — no issues identified. ADCO Site Manager has revised the daily start-up checklist to flag scaffold inspection currency. Closed.',
  },

  // ============================================================
  // PINK / VARIATIONS (6)
  // ============================================================
  {
    title: 'VAR-001 BMU upgrade — discussion + approval rationale',
    color: 'pink',
    noteDate: '2026-02-18',
    content:
      'Following landscape architect proposal to extend roof terrace planters along the western edge, the existing BMU specification (CoxGomyl 750E) cannot reach the new planter bed for facade maintenance. Three options reviewed:\n\n1. Track extension + additional davit point: $48k (ADCO subcontractor proposal)\n2. Replacement BMU with longer reach: $145k\n3. Reduce planter footprint to suit existing BMU reach: nil cost but compromises landscape design\n\nClient (Marcus O\'Brien) elected Option 1. Variation approved 4 March 2026. ADCO to coordinate procurement with the cladding subcontractor — installation tied to facade scaffold strike.',
  },
  {
    title: 'VAR-002 MSB capacity uplift — services scope change',
    color: 'pink',
    noteDate: '2026-02-08',
    content:
      'NDY load study (issued 5 Feb) identified that the original 800A MSB cannot accommodate the EV charging load if more than 4 of the 14 carpark bays are converted to EV charging concurrently. Client direction is to provide future-proof capacity for all 14 bays. Variation includes:\n\n— MSB upgrade 800A → 1200A\n— Substation transformer upgrade (coordinated with Ausgrid — no cost)\n— Sub-mains uplift\n— Allowance for additional commissioning testing\n\nApproved by Owner 12 Feb. Procurement now released. Stowe Australia to revise installation programme — no critical path impact.',
  },
  {
    title: 'VAR-003 Lift specification change — cost discussion',
    color: 'pink',
    noteDate: '2026-02-12',
    content:
      'Client preference upgrade — base specification (Schindler 3300) substituted to KONE EcoSpace. Cost delta $14k absorbed into variations. Benefits: 13-person capacity (vs 8), destination control allocation, premium car finishes (brushed stainless + glass rear wall). Lead time impact: nil — KONE confirmed delivery within original programme window. Architect (SJB) to issue updated lift lobby finishes RFI to coordinate with new car opening dimensions.',
  },
  {
    title: 'VAR-004 Facade colour revision — pending architect coordination',
    color: 'pink',
    noteDate: '2026-04-09',
    isStarred: true,
    content:
      'Client request to change facade anodised aluminium colour from RAL 7016 (anthracite grey) to bespoke bronze. Status: PENDING. Outstanding items:\n\n1. Architect to issue revised facade samples for client sign-off\n2. Fairview to confirm lead time impact (preliminary advice: +4 weeks for bespoke colour batch)\n3. QS to assess cost impact (preliminary $35k)\n4. Programme impact assessment — possible delay to facade completion milestone\n\nClient briefed that any approval after 30 April will likely impact PCD. Decision required by 25 April. Waiting on Marcus to confirm by EoW.',
  },
  {
    title: 'VAR-005 Planter box additions — landscape proposal',
    color: 'pink',
    noteDate: '2026-04-15',
    content:
      'Landscape architect (Emily Watson, 360 Degrees) has proposed 6no. additional 1500L self-watering planters to the north-east roof terrace to enhance amenity and provide visual screening to mechanical plant. Items:\n\n— Planters: $4,800\n— Structural beam reinforcement (additional 3.5kN/m² loading): $2,200\n— Soil + planting: $1,000\n— Total: $8,000\n\nVariation forecast issued 15 April. Awaiting structural engineer confirmation that beam reinforcement does not require revisit of the L7/roof structural design (likely captured by existing margin per Karen Patel preliminary email 14 April).',
  },
  {
    title: 'VAR-006 Lobby finishes upgrade — REJECTED',
    color: 'pink',
    noteDate: '2026-03-19',
    content:
      'Client requested upgrade of lobby finishes from porcelain large-format tiles + powder-coated aluminium reveals to honed travertine + brushed brass. Cost premium $42k. Reviewed in design coordination meeting 18 March. Decision: REJECTED. Value engineering rationale:\n\n— Travertine sealing/maintenance regime imposes ongoing strata cost\n— Brass tarnishing in coastal environment increases warranty risk\n— Original specification meets brief and is consistent with apartment finishes tier\n\nOriginal specification retained. SJB to ensure client receives the rejection in writing and that the original sample remains the reference for installation.',
  },

  // ============================================================
  // YELLOW / RFI ON DESIGN (8)
  // ============================================================
  {
    title: 'RFI-014 Stair B pressurisation — fire engineer query',
    color: 'yellow',
    noteDate: '2026-03-04',
    isStarred: true,
    content:
      'Holmes Fire (Matthew Reilly) has raised an RFI regarding the design of Stair B pressurisation system. NCC DTS solution as documented requires 50Pa overpressure relative to the corridor with the door open. The proposed mechanical layout shows 38Pa per the NDY mech schedule. Two options:\n\n1. Increase fan capacity (NDY to confirm — likely suits with a 110% fan but requires AHU re-trim)\n2. Performance solution under NCC C2D14 (would require fire engineering performance brief revision and council acceptance)\n\nAwaiting NDY response. RFI due 12 March. If Option 2 is required, programme impact estimated at 2 weeks.',
  },
  {
    title: 'RFI-018 Slab penetration coordination',
    color: 'yellow',
    noteDate: '2026-03-12',
    content:
      'Hydraulic subcontractor (Cooke & Dowsett) flagged that the L4 services riser shaft is undersized when actual installed sleeve sizes are accommodated. Compounded by the addition of two extra fire hose reel risers added during VAR-002. Architect, structural and services engineers reviewing combined coordination drawing. Possible options: increase shaft footprint by 80mm to the south (no impact on apartment GFA), or relocate one fire riser to the north shaft (requires fire engineer review). Response required before L4 slab pour scheduled 18 March.',
  },
  {
    title: 'RFI-022 Balustrade detail clarification',
    color: 'yellow',
    noteDate: '2026-03-22',
    content:
      'ADCO has requested clarification on the apartment balcony balustrade glass thickness. SJB drawings show 12mm toughened laminated; structural engineer specification calls for 13.52mm. Difference is material — supplier confirmed lead time for 13.52mm is 8 weeks vs 4 weeks for 12mm. Resolution: Northrop confirmed 12mm acceptable subject to revised connection detail (4 fixings rather than 3). SJB to issue revised detail. RFI closed 28 March.',
  },
  {
    title: 'RFI-025 Basement waterproofing — interface with retaining wall',
    color: 'yellow',
    noteDate: '2026-01-28',
    content:
      'Cooke & Dowsett raised the interface treatment between the basement waterproof membrane (Sika SikaProof) and the contiguous piled retaining wall on the southern boundary. Drawing detail shows membrane terminating at the wall but does not show a flashing or upstand to the bored pile cap level. Architectural detail SJB-A2.05 conflicts with engineering detail NCE-S5.03. Resolved in coordination meeting — agreed to extend membrane up the wall face to RL +0.5m with a stainless steel termination strip. SJB to update detail in next CC issue.',
  },
  {
    title: 'RFI-029 Lift pit drainage — discipline coordination',
    color: 'yellow',
    noteDate: '2026-02-05',
    content:
      'Lift subcontractor (KONE) requires a 75mm Ø trapped drain in each lift pit per AS 1735.2. Hydraulic schedule shows no pit drains. Structural detail shows pit floor with 1:100 fall to a sump but does not detail drainage piping. NDY to update hydraulic schedule to include pit drains tied to the basement sump pump system. Cooke & Dowsett to coordinate installation with KONE shaft sequencing. RFI closed 11 Feb.',
  },
  {
    title: 'RFI-031 Acoustic separation between apartments',
    color: 'yellow',
    noteDate: '2026-02-19',
    content:
      'Acoustic Logic (Daniel Webb) requested clarification on the wall build-up between adjacent apartments. SJB schedule shows 92mm timber stud + 13mm acoustic plasterboard each side; acoustic specification requires a Rw50 outcome. As detailed, Acoustic Logic\'s assessment shows Rw48 — does not meet brief. Resolution: upgrade plasterboard to 16mm acoustic both sides plus 50mm acoustic insulation in the wall cavity. ADCO to price; estimated $8/m² × ~3,400m² = $27k impact. RFI status: pending cost agreement.',
  },
  {
    title: 'RFI-034 Roof terrace planter waterproofing',
    color: 'yellow',
    noteDate: '2026-04-01',
    content:
      'Landscape architect (360 Degrees) has detailed roof terrace planter boxes as integrated structural concrete with internal waterproofing. SJB queries whether the spec calls for sheet membrane or liquid-applied membrane. NDY confirms liquid-applied (Bostik LM-100) compatible with planting medium and root barrier. Awaiting confirmation that warranty extends to root penetration (typically 10 years). RFI in progress.',
  },
  {
    title: 'RFI-038 Fire damper locations',
    color: 'yellow',
    noteDate: '2026-04-19',
    content:
      'NDY services drawings show fire dampers at all corridor crossings, but the locations conflict with the architectural ceiling grid in 4 apartments on L3 (units 304, 308, 311, 315). Mechanical sub-contractor (TBA) seeking confirmation of resolution: relocate dampers to the riser shaft side (requires NCC compliance review by fire engineer) or accept ceiling grid modification (requires architect sign-off). Response required by 28 April for procurement of revised damper schedule.',
  },

  // ============================================================
  // BLUE / EOT (6)
  // ============================================================
  {
    title: 'EOT #1 — Wet weather event March 2026 (5 days approved)',
    color: 'blue',
    noteDate: '2026-03-31',
    isStarred: true,
    content:
      'EOT claim submitted by ADCO 27 March covering the wet weather event 17–24 March 2026. BoM data confirms 142mm rainfall over the 8-day period, with 4 days exceeding 25mm/day (the threshold for a qualifying event under cl. 35.2 of the contract).\n\nClaimed days: 8\nGranted: 5 (Owner deducted 3 days representing periods where indoor work was practicable)\n\nRevised PCD target: 28 October 2026 (was 23 October). Updated programme issued by ADCO 30 March showing impact propagation through the L4 structure and facade activities. EOT formally granted in writing 1 April.',
  },
  {
    title: 'EOT #2 — Latent condition (rock in footings) — 3 days approved',
    color: 'blue',
    noteDate: '2025-12-04',
    content:
      'EOT claim submitted following the latent condition notice (CN-002) of 19 November regarding sandstone bedrock encountered in the southern footings. ADCO claimed 5 days for additional rock-breaking and revised footing design coordination with Northrop. Owner granted 3 days based on:\n\n— 2 days material delay (rock breaker mobilisation): GRANTED\n— 1 day design coordination: GRANTED\n— 2 additional days for productivity loss: NOT GRANTED (within contractor risk)\n\nFormal EOT notification issued 4 December. PCD adjusted to reflect the granted days.',
  },
  {
    title: 'EOT #3 — Concrete supplier industrial action — under assessment',
    color: 'blue',
    noteDate: '2025-12-19',
    content:
      'ADCO submitted an EOT claim 18 December covering the 4-day disruption to concrete supply (15–18 Dec) caused by industrial action at Holcim Erskine Park batching plant. ADCO notes the supplier is the named subcontractor in the head contract.\n\nClaim assessment in progress. Position pending advice from solicitor regarding whether industrial action by a named subcontractor qualifies as a Compensable Cause or sits within ADCO\'s risk under cl. 9 of AS 4902.\n\nQS view: claim has merit. Awaiting Owner direction. Indicative impact 4 days, $0 cost (time only).',
  },
  {
    title: 'EOT #4 — Late issue of L3 structural drawings — 2 days approved',
    color: 'blue',
    noteDate: '2026-01-23',
    content:
      'ADCO submitted EOT 20 January covering 2 days of programme impact resulting from late issue of revised L3 structural drawings. Northrop issued REV B drawings on 16 January (originally programmed for 12 January per the design release schedule).\n\nClaim ASSESSED and GRANTED in full. 2 days extension. PCD updated. Process review undertaken with Northrop — design release schedule revised to provide a 5-day buffer ahead of construction need-by dates.',
  },
  {
    title: 'EOT #5 — VAR-001 BMU upgrade time impact — pending',
    color: 'blue',
    noteDate: '2026-03-08',
    content:
      'ADCO submitted EOT claim alongside VAR-001 (BMU upgrade) for 1 day extension covering coordination time with the cladding subcontractor for the BMU track extension installation. Per the contract, EOT for variations is to be assessed within the variation approval process.\n\nClaim status: Pending. Position: variation approved 4 March, but EOT impact requires further substantiation by ADCO regarding whether the coordination work is on the critical path. Karen Patel (Northrop) verifying via the as-built programme model. Response required by 16 April.',
  },
  {
    title: 'EOT #6 — Service interruption substation tie-in — 1 day approved',
    color: 'blue',
    noteDate: '2026-04-22',
    content:
      'ADCO submitted EOT 21 April for 1 day extension covering the Ausgrid substation tie-in scheduled for 28 April. Per cl. 35.2, the work is being undertaken by an authority and is not within the contractor\'s control.\n\nClaim ASSESSED and GRANTED. 1 day extension. PCD adjusted to 29 October 2026. ADCO to confirm any consequential impact on subcontractor mobilisation; preliminary assessment is nil impact (subcontractors aware of shutdown and have programmed alternative tasks).',
  },

  // ============================================================
  // GREEN / APPROVALS & SIGN-OFFS (4)
  // ============================================================
  {
    title: 'Cladding sample sign-off — Fairview anodised aluminium',
    color: 'green',
    noteDate: '2026-02-26',
    isStarred: true,
    content:
      'Client (Marcus O\'Brien) and architect (David Liu, SJB) signed off the Fairview cladding sample at site sample inspection 25 February. Approved finish: RAL 7016 anodised aluminium, 4mm panel, 35mm reveal pattern. Sample retained on site as the production reference. Fairview confirmed delivery of first batch 12 March. Note: this approval has been superseded by VAR-004 facade colour revision discussion (see pink note 9 April).',
  },
  {
    title: 'Tile selection approved — bathrooms + ensuites',
    color: 'green',
    noteDate: '2026-03-12',
    content:
      'Tile selection finalised for all 33 apartments: floor — Beaumont Gemtone porcelain 600×600mm Gris; walls — Beaumont Velvet Stone 300×600mm vertical stack. Skirt tiles match floor. Approved by Marcus O\'Brien at the 11 March client meeting. SJB to issue revised tile schedule to ADCO; tiler to procure following confirmation of bath stone slab schedule. No cost variation — selections within the original spec PC sum.',
  },
  {
    title: 'Joinery shop drawings approved — kitchens',
    color: 'green',
    noteDate: '2026-03-19',
    content:
      'Kitchen joinery shop drawings approved — supplier Eurobib Joinery. Confirmation of:\n\n— Carcase: white melamine, 18mm\n— Door + drawer fronts: matt 2-pak in 3 colourways (white, light grey, charcoal) per apartment scheme\n— Bench: 20mm reconstituted stone, "Calacatta Vena" finish\n— Hardware: Blum LegraBox + soft-close hinges\n\nFirst kitchen prototype to be installed in the on-site display apartment by 30 April for client final review before full production release.',
  },
  {
    title: 'Substructure milestone — formal sign-off',
    color: 'green',
    noteDate: '2026-03-09',
    content:
      'Substructure milestone (basement walls, basement slab and ground floor slab) formally signed off by the structural engineer (Karen Patel, Northrop) at site inspection 6 March. Inspection report issued with no defects requiring rectification. Concrete strength results all exceed F40 specified strength at 28 days. ADCO progress claim aligned with milestone — released for payment in PC #5.',
  },
];

export async function seedNotes(tx: any, profile: ProfileResult): Promise<void> {
  const records = NOTES.map((n, idx) => {
    const ts = new Date(n.noteDate + 'T09:00:00').toISOString();
    return {
      id: crypto.randomUUID(),
      projectId: profile.projectId,
      organizationId: profile.organizationId,
      title: n.title,
      content: n.content,
      isStarred: n.isStarred ?? false,
      color: n.color,
      noteDate: n.noteDate,
      createdAt: ts,
      updatedAt: ts,
    };
  });

  await tx.insert(notes).values(records);
}
