/**
 * @jest-environment node
 *
 * Targeted-assertion snapshot tests for the generate prompt builders.
 *
 * The 5-case matrix below is the regression-prevention layer for the original
 * bug class: "I changed the profile and the output didn't change." Each case
 * asserts that specific phrases are present (mustContain) or absent
 * (mustNotContain) in the assembled prompt, before it ever reaches the AI.
 *
 * Test 4 in particular is the regression test for the user-reported bug —
 * changing workScope items must change the prompt.
 */

import {
  buildInferencePrompt,
  buildExtractionPrompt,
  buildFullDocumentObjectivesPrompt,
  buildObjectiveSelectionPrompt,
  prepareObjectiveSelectionCandidates,
} from '../prompt-builders';

describe('buildInferencePrompt — advisory snapshot matrix', () => {
  const baseInput = () => ({
    buildingClass: 'residential',
    subclass: ['apartments'] as string[],
    scaleData: { storeys: 8, units: 60 } as Record<string, number | string>,
    complexity: {} as Record<string, string | string[]>,
    functionalRulesFormatted: '',
    planningRulesFormatted: '',
    domainContextSection: '',
  });

  it('case 1: build project (new + apartments) — uses build labels', () => {
    const prompt = buildInferencePrompt({
      ...baseInput(),
      projectType: 'new',
      workScopeLabels: [],
      functionalRulesFormatted: '- 8-storey construction',
      planningRulesFormatted: '- DA approval required',
    });

    // Build labels present
    expect(prompt).toContain('Project Type: new');
    expect(prompt).toContain('FUNCTIONAL');
    expect(prompt).toContain('QUALITY');
    expect(prompt).toContain('SOURCE DISCIPLINE - NO DOCUMENTS ATTACHED');
    expect(prompt).toContain('Do NOT turn conditional seed-guide examples into project facts');
    expect(prompt).toContain('Start each objective with a useful obligation verb');

    // Advisory labels absent
    expect(prompt).not.toContain('Scope of Advice');
    expect(prompt).not.toContain('Engagement Conditions');
  });

  it('adds concrete profile-derived anchors for no-document apartment brief generation', () => {
    const prompt = buildInferencePrompt({
      buildingClass: 'residential',
      projectType: 'new',
      subclass: ['apartments'],
      scaleData: {
        storeys: 8,
        units: 33,
        avg_unit_sqm: 88,
        parking_bays: 70,
      },
      complexity: {},
      workScopeLabels: [
        'Demolition',
        'Site Clearance',
        'Decontamination',
        'Bulk Earthworks',
        'Site Drainage',
        'Stormwater Management',
        'Internal Roads',
        'Partitions Walls Ceilings Flooring',
      ],
      classDescriptors: ['Class 2: Apartment building'],
      functionalRulesFormatted: '',
      planningRulesFormatted: '',
      domainContextSection: '',
    });

    expect(prompt).toContain('PROFILE-DERIVED BRIEF ANCHORS');
    expect(prompt).toContain('storeys: 8');
    expect(prompt).toContain('units: 33');
    expect(prompt).toContain('average unit size sqm: 88');
    expect(prompt).toContain('parking spaces: 70');
    expect(prompt).toContain('Deliver 8-storey apartment building');
    expect(prompt).toContain('Integrate 70 parking spaces');
    expect(prompt).toContain('Coordinate civil, stormwater and site-work approvals');
    expect(prompt).toContain('Set apartment facade, acoustic and waterproofing standards');
    expect(prompt).toContain('Comply with Class 2 NCC, BASIX and NatHERS');
    expect(prompt).toContain('Avoid vague replacements such as "standard DA approval"');
  });

  it('uses project name as a soft intent hint when subclass is commercial other', () => {
    const prompt = buildInferencePrompt({
      projectName: 'Amenities Block 2 Replacement',
      buildingClass: 'commercial',
      projectType: 'new',
      subclass: ['other'],
      scaleData: { storeys: 1, gfa_sqm: 120 },
      complexity: {},
      workScopeLabels: ['Demolition', 'Site Clearance', 'Hydraulic Plumbing'],
      classDescriptors: [],
      functionalRulesFormatted: '',
      planningRulesFormatted: '',
      domainContextSection: '',
    });

    expect(prompt).toContain('Project Name: Amenities Block 2 Replacement');
    expect(prompt).toContain('Project name signal: Amenities Block 2 Replacement -> use "amenities block"');
    expect(prompt).toContain('Deliver 1-storey replacement amenities block');
    expect(prompt).toContain('Confirm approval pathway for 1-storey amenities block replacement');
    expect(prompt).not.toContain('1-storey other');
  });

  it('case 2: advisory + no scope — uses advisory labels and shows draft note', () => {
    const prompt = buildInferencePrompt({
      ...baseInput(),
      projectType: 'advisory',
      workScopeLabels: [],
      // No rules — advisory always skips inference rules
    });

    // Advisory labels present
    expect(prompt).toContain('Project Type: advisory');
    expect(prompt).toContain('SCOPE OF ADVICE');
    expect(prompt).toContain('ENGAGEMENT CONDITIONS');
    expect(prompt).toContain('REVIEW STANDARDS & METHODOLOGY');
    expect(prompt).toContain('DELIVERABLES');

    // Draft note when no documents (the user instruction was to avoid the
    // explicit "no documents attached" framing — the draft mode is signalled
    // via the softer phrasing)
    expect(prompt).toContain('draft');

    // Build-only labels and example phrases absent
    expect(prompt).not.toContain('FUNCTIONAL (functional bucket)');
    expect(prompt).not.toContain('Premium material selection');

    // Inference rules block should explicitly note bypass for advisory
    expect(prompt).toMatch(/intentionally bypassed for advisory/i);
  });

  it('case 3: advisory + scope (cost_plan_review + programme_review) — scope flows into prompt', () => {
    const prompt = buildInferencePrompt({
      ...baseInput(),
      projectType: 'advisory',
      workScopeLabels: ['Cost Plan Review', 'Programme Review'],
    });

    // Scope items reach the AI
    expect(prompt).toContain('Cost Plan Review');
    expect(prompt).toContain('Programme Review');

    // Advisory-specific scope-constraint framing (services, not construction)
    expect(prompt).toContain('Scope of Advice');
    expect(prompt).toMatch(/advisory engagement/i);
    expect(prompt).toMatch(/not as construction work/i);
  });

  it('case 4: REGRESSION — re-running with changed scope changes the prompt', () => {
    // First run with cost_plan_review
    const promptA = buildInferencePrompt({
      ...baseInput(),
      projectType: 'advisory',
      workScopeLabels: ['Cost Plan Review'],
    });

    // Second run with procurement_review only
    const promptB = buildInferencePrompt({
      ...baseInput(),
      projectType: 'advisory',
      workScopeLabels: ['Procurement Review'],
    });

    // The new scope appears, the old scope is gone — this is the bug the user
    // reported. If anyone reintroduces the workScope filter, an empty scope
    // pass-through, or any other propagation break, this test fails.
    expect(promptB).toContain('Procurement Review');
    expect(promptB).not.toContain('Cost Plan Review');

    // And the first run's prompt did contain Cost Plan Review (proving the
    // delta is real and not test setup confusion)
    expect(promptA).toContain('Cost Plan Review');
    expect(promptA).not.toContain('Procurement Review');
  });
});

describe('buildExtractionPrompt — advisory document path', () => {
  it('full-document path asks the model to select final objectives from the whole attachment', () => {
    const prompt = buildFullDocumentObjectivesPrompt({
      projectType: 'new',
      buildingClass: 'residential',
      profileSummary: '- Storeys: 8\n- Units: 33',
      attachedDocumentContext:
        '## Full Indexed Attached Document Text\nPrincipal approval required. Development Consent DA201500704. Address: 568-572 Parramatta Rd. GFA 781 sqm.',
    });

    expect(prompt).toContain('Attached Document Text - Authoritative');
    expect(prompt).toContain('Read the attached document text as a whole');
    expect(prompt).toContain('Development Consent DA201500704');
    expect(prompt).toContain('sourceDetail');
    expect(prompt).not.toContain('Retrieved Content');
    expect(prompt).not.toContain('candidate extraction pass');
  });

  it('case 5: advisory + retrieved content — uses advisory section labels and source-hierarchy note', () => {
    const prompt = buildExtractionPrompt({
      projectType: 'advisory',
      buildingClass: 'residential',
      domainContextSection: '',
      retrievedFunctional:
        '[Source 1: Engagement Letter] Independent review of stage 3 cost plan against AIQS benchmarks.',
      retrievedPlanning:
        '[Source 2: Engagement Letter] Monthly status report and PCG attendance.',
    });

    // Retrieved content surfaces in the prompt
    expect(prompt).toContain('Independent review of stage 3 cost plan');
    expect(prompt).toContain('Monthly status report');

    // Advisory section labels are used as the headers for retrieved content
    expect(prompt).toContain('Scope of Advice');
    expect(prompt).toContain('Engagement Conditions');

    // Source-hierarchy note is advisory-specific
    expect(prompt).toMatch(/AUTHORITATIVE/);
    expect(prompt).toMatch(/Source hierarchy.*advisory/i);

    // Build labels absent
    expect(prompt).not.toContain('FUNCTIONAL (functional bucket)');
    expect(prompt).not.toContain('Premium material selection');
  });

  it('build extraction path keeps existing build labels (no regression for build projects)', () => {
    const prompt = buildExtractionPrompt({
      projectType: 'new',
      buildingClass: 'residential',
      domainContextSection: '',
      retrievedFunctional: '[Source 1: Brief] Open-plan living required.',
      retrievedPlanning: '[Source 2: Brief] DA submission required.',
    });

    expect(prompt).toContain('Project Type: new');
    expect(prompt).toContain('Functional');
    expect(prompt).not.toContain('Scope of Advice');
    expect(prompt).not.toMatch(/Source hierarchy.*advisory/i);
  });

  it('puts full indexed attached-document context ahead of retrieved excerpts', () => {
    const prompt = buildExtractionPrompt({
      projectType: 'new',
      buildingClass: 'residential',
      domainContextSection: '',
      attachedDocumentContext:
        'Principal approval required. Development Consent DA201500704. Address: 568-572 Parramatta Rd. GFA 781 sqm.',
      retrievedFunctional: '[Source 1: Generic] Allocate crane time for material deliveries.',
      retrievedPlanning: '[Source 2: Generic] Program authority inspections.',
    });

    expect(prompt).toContain('Attached Indexed Document Context - AUTHORITATIVE');
    expect(prompt).toContain('Development Consent DA201500704');
    expect(prompt).toContain('First use the Attached Indexed Document Context');
    expect(prompt).toContain('Avoid generic construction-management advice');
    expect(prompt).toContain('candidate extraction pass');
    expect(prompt).toContain('8-15 source-backed candidate objectives');
    expect(prompt).toContain('"sourceDetail"');
    expect(prompt.indexOf('Development Consent DA201500704')).toBeLessThan(
      prompt.indexOf('Allocate crane time for material deliveries')
    );
  });

  it('selection pass rolls low-level clause details into sharper brief objectives', () => {
    const prompt = buildObjectiveSelectionPrompt({
      projectType: 'new',
      buildingClass: 'residential',
      section: 'quality',
      candidates: {
        quality: [
          {
            text: 'Premium sealed pavers, slip rating',
            sourceDetail: 'All pavers are to be sealed using premium penetrating sealer and maintain slip rating.',
          },
          {
            text: '15-year waterproofing warranties required',
            sourceDetail: 'A 15 Year warranty is to be provided for waterproofing.',
          },
        ],
      },
    });

    expect(prompt).toContain('senior construction brief editor');
    expect(prompt).toContain('Prefer broad, brief-worthy parent obligations');
    expect(prompt).toContain('ALWAYS select the broad roll-up');
    expect(prompt).toContain('Final Text Must Avoid');
    expect(prompt).toContain('BAD: "Premium sealed pavers, slip rating"');
    expect(prompt).toContain('GOOD: "Deliver durable public-domain finishes"');
    expect(prompt).toContain('15-year waterproofing warranties required');
  });

  it('prepares deterministic roll-up candidates for common PPR clause details', () => {
    const prepared = prepareObjectiveSelectionCandidates({
      planning: [
        { text: 'Follow council signage design', sourceDetail: 'Council signage design requirements apply.' },
      ],
      quality: [
        { text: 'Three-coat painted surfaces', sourceDetail: 'Paintwork requires a three-coat system.' },
      ],
      compliance: [
        { text: 'BASIX requirements for tapware', sourceDetail: 'All tapware must comply with BASIX requirements.' },
        { text: 'Fire rated walls compliance', sourceDetail: 'Fire-rated walls must meet NCC requirements.' },
      ],
    });

    expect(prepared.planning?.map((item) => item.text)).toContain('Coordinate Council public domain works');
    expect(prepared.quality?.map((item) => item.text)).toContain('Deliver durable finish standards');
    expect(prepared.compliance?.map((item) => item.text)).toContain('Comply with BASIX sustainability requirements');
    expect(prepared.compliance?.map((item) => item.text)).toContain('Maintain fire safety compliance');
  });
});
