import {
  consultants,
  rftNew,
  addenda,
  evaluations,
  evaluationPrice,
  evaluationRows,
  evaluationCells,
  evaluationNonPriceCriteria,
  evaluationNonPriceCells,
  trr,
} from '@/lib/db/pg-schema';
import type { ProfileResult } from './profile';
import type { StakeholderIdMap } from './stakeholders';
import { subgroupKey } from './stakeholders';
import { TENDER_FIRMS } from './data';

interface DisciplineSeed {
  subgroup: 'Architecture' | 'Structural';
  rftDate: string;
  addendumDate: string;
  trrDate: string;
  trrSummary: string;
  trrRecommendation: string;
  trrClarifications: string;
}

const DISCIPLINES: DisciplineSeed[] = [
  {
    subgroup: 'Architecture',
    rftDate: '2025-08-12',
    addendumDate: '2025-08-26',
    trrDate: '2025-09-12',
    trrSummary:
      'Three architectural firms were shortlisted and tendered for the Lighthouse Residences project. Submissions assessed against price (60%) and non-price (40%) criteria including experience, methodology, programme and resourcing. SJB Architects emerged as the preferred firm based on a combination of competitive pricing, strong portfolio of comparable Wentworth Point apartment projects, and immediate availability of senior project architect.',
    trrRecommendation:
      'Recommend appointment of SJB Architects on AS 4122-2010 (Architects Conditions of Engagement) for full architectural services SD → CA. Total fee: $420,000 (excl. GST), payable per stage milestones. Engagement to commence on 1 October 2025 with SD revisited under construction documentation.',
    trrClarifications:
      'Pre-award clarifications obtained from SJB regarding (1) BIM coordination protocols (LOD 350 confirmed), (2) site representation frequency during CA (weekly minimum), (3) variation management process, and (4) PI insurance coverage ($20M confirmed valid through Dec 2026). All clarifications resolved satisfactorily prior to recommendation.',
  },
  {
    subgroup: 'Structural',
    rftDate: '2025-08-12',
    addendumDate: '2025-08-28',
    trrDate: '2025-09-15',
    trrSummary:
      'Three structural engineering firms tendered for the Lighthouse Residences project. Northrop Consulting Engineers emerged as the preferred firm — competitive pricing across all stages, strong post-tensioned slab experience for Class 2 residential, and proven local Sydney delivery team. JJ Marino offered the lowest price but flagged capacity constraints during the CA peak.',
    trrRecommendation:
      'Recommend appointment of Northrop Consulting Engineers on AS 4122-2010 for full structural engineering services SD → CA. Total fee: $180,000 (excl. GST), payable per stage milestones. Engagement to commence on 1 October 2025.',
    trrClarifications:
      'Clarifications obtained from Northrop on (1) coordination protocol with NDY for slab penetration design, (2) acceptance of EOT process for late information, and (3) software platform compatibility (Tekla Structures BIM model to be issued at LOD 350). All resolved.',
  },
];

interface InsertedFirm {
  id: string;
  companyName: string;
  discipline: 'Architecture' | 'Structural';
}

export async function seedProcurement(
  tx: any,
  profile: ProfileResult,
  stakeholderIds: StakeholderIdMap
): Promise<void> {
  // 1. Create the tender firms in the legacy `consultants` table
  // (this drives the firm cards in the procurement panel)
  const insertedFirms: InsertedFirm[] = [];

  for (const firm of TENDER_FIRMS) {
    const id = crypto.randomUUID();
    insertedFirms.push({ id, companyName: firm.companyName, discipline: firm.discipline });

    await tx.insert(consultants).values({
      id,
      projectId: profile.projectId,
      companyName: firm.companyName,
      contactPerson: firm.contactPerson,
      discipline: firm.discipline,
      email: firm.email,
      phone: firm.phone,
      mobile: null,
      address: firm.address,
      abn: firm.abn,
      notes: firm.experienceNote,
      shortlisted: firm.shortlisted,
      awarded: firm.awarded,
      companyId: null,
    });
  }

  // 2. For each discipline, create RFT, Addendum, Evaluation Price, Evaluation Non-Price, and TRR
  for (const d of DISCIPLINES) {
    const stakeholderId = stakeholderIds.get(subgroupKey('consultant', d.subgroup));
    if (!stakeholderId) {
      throw new Error(`Procurement: stakeholder not found for subgroup ${d.subgroup}`);
    }

    const firmsForDiscipline = insertedFirms.filter((f) => f.discipline === d.subgroup);

    // ---- RFT ----
    await tx.insert(rftNew).values({
      id: crypto.randomUUID(),
      projectId: profile.projectId,
      stakeholderId,
      rftNumber: 1,
      rftDate: d.rftDate,
    });

    // ---- Addendum ----
    await tx.insert(addenda).values({
      id: crypto.randomUUID(),
      projectId: profile.projectId,
      stakeholderId,
      addendumNumber: 1,
      content:
        d.subgroup === 'Architecture'
          ? 'Addendum #1 — clarification on apartment mix (revised to 8 × 1-bed, 18 × 2-bed, 7 × 3-bed). Tender response period extended by 5 business days. Revised RFI register attached.'
          : 'Addendum #1 — geotechnical bore logs uploaded (JK Geotechnics report dated 4 August 2025). Confirmed expectation of pile design in light of medium-dense sand to RL -5.2. Tender response period extended by 3 business days.',
      addendumDate: d.addendumDate,
    });

    // ---- Evaluation Price (price comparison table) ----
    const evalPriceId = crypto.randomUUID();
    await tx.insert(evaluationPrice).values({
      id: evalPriceId,
      projectId: profile.projectId,
      stakeholderId,
      evaluationPriceNumber: 1,
    });

    // Price rows: one per stage (SD, DD, CC, CA) + Total
    const stages: { key: 'sd' | 'dd' | 'cc' | 'ca' | 'total'; label: string }[] = [
      { key: 'sd', label: 'Schematic Design' },
      { key: 'dd', label: 'Detail Design' },
      { key: 'cc', label: 'CC Documentation' },
      { key: 'ca', label: 'Contract Administration' },
      { key: 'total', label: 'TOTAL TENDER PRICE' },
    ];

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      const rowId = crypto.randomUUID();
      await tx.insert(evaluationRows).values({
        id: rowId,
        evaluationId: null,
        evaluationPriceId: evalPriceId,
        tableType: 'price',
        description: stage.label,
        orderIndex: i,
        isSystemRow: stage.key === 'total',
        costLineId: null,
        source: 'manual',
        sourceSubmissionId: null,
      });

      // One cell per firm
      for (const firm of firmsForDiscipline) {
        const tenderFirm = TENDER_FIRMS.find(
          (tf) => tf.companyName === firm.companyName && tf.discipline === d.subgroup
        );
        if (!tenderFirm) continue;
        const amountDollars =
          stage.key === 'total'
            ? tenderFirm.pricePerStage.sd +
              tenderFirm.pricePerStage.dd +
              tenderFirm.pricePerStage.cc +
              tenderFirm.pricePerStage.ca
            : tenderFirm.pricePerStage[stage.key];

        await tx.insert(evaluationCells).values({
          id: crypto.randomUUID(),
          rowId,
          firmId: firm.id,
          firmType: 'consultant',
          amountCents: amountDollars * 100,
          source: 'manual',
          confidence: null,
        });
      }
    }

    // ---- Evaluation Non-Price ----
    // The `evaluations` row drives non-price comparison
    const evalId = crypto.randomUUID();
    await tx.insert(evaluations).values({
      id: evalId,
      projectId: profile.projectId,
      stakeholderId,
      deletedCostLineIds: '[]',
    });

    const nonPriceCriteria = [
      { key: 'experience', label: 'Relevant experience' },
      { key: 'methodology', label: 'Methodology + brief response' },
      { key: 'programme', label: 'Programme commitment' },
      { key: 'resourcing', label: 'Team + resourcing' },
      { key: 'risk', label: 'Risk identification' },
    ];

    for (let ci = 0; ci < nonPriceCriteria.length; ci++) {
      const crit = nonPriceCriteria[ci];
      const critId = crypto.randomUUID();
      await tx.insert(evaluationNonPriceCriteria).values({
        id: critId,
        evaluationId: evalId,
        criteriaKey: crit.key,
        criteriaLabel: crit.label,
        orderIndex: ci,
      });

      for (const firm of firmsForDiscipline) {
        const tenderFirm = TENDER_FIRMS.find(
          (tf) => tf.companyName === firm.companyName && tf.discipline === d.subgroup
        );
        if (!tenderFirm) continue;

        // Build per-criterion content from the experienceNote + qualityRating
        const contentByKey: Record<string, string> = {
          experience: tenderFirm.experienceNote,
          methodology:
            tenderFirm.qualityRating === 'A'
              ? 'Strong response — detailed methodology with clear staging and BIM protocols documented.'
              : tenderFirm.qualityRating === 'B'
                ? 'Acceptable response — methodology covered key elements but lacked depth on coordination protocols.'
                : 'Generic methodology — relied heavily on standard templates without project-specific tailoring.',
          programme:
            tenderFirm.qualityRating === 'A'
              ? 'Programme commitments aligned with master programme. Realistic resourcing assumptions.'
              : 'Programme commitments achievable but with limited buffer for delays.',
          resourcing:
            tenderFirm.qualityRating === 'A'
              ? 'Senior project lead committed full-time. Adequate support team identified.'
              : tenderFirm.qualityRating === 'B'
                ? 'Project lead committed 60% time — borderline for project complexity.'
                : 'Resource plan unclear — risk of dilution across concurrent projects.',
          risk:
            tenderFirm.qualityRating === 'A'
              ? 'Comprehensive risk register provided with mitigation strategies for each identified risk.'
              : 'Standard risk register — limited mitigation detail.',
        };

        await tx.insert(evaluationNonPriceCells).values({
          id: crypto.randomUUID(),
          criteriaId: critId,
          firmId: firm.id,
          firmType: 'consultant',
          extractedContent: contentByKey[crit.key],
          qualityRating: tenderFirm.qualityRating,
          userEditedContent: null,
          userEditedRating: null,
          source: 'manual',
          confidence: null,
          sourceChunks: null,
          sourceSubmissionId: null,
        });
      }
    }

    // ---- TRR (Tender Recommendation Report) ----
    await tx.insert(trr).values({
      id: crypto.randomUUID(),
      projectId: profile.projectId,
      stakeholderId,
      trrNumber: 1,
      executiveSummary: d.trrSummary,
      clarifications: d.trrClarifications,
      recommendation: d.trrRecommendation,
      reportDate: d.trrDate,
    });
  }
}
