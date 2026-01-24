import { ProjectTypeId } from './project-types';

export interface ObjectivesTemplate {
  functional: string;
  quality: string;
  budget: string;
  program: string;
}

export const objectivesTemplates: Record<ProjectTypeId, ObjectivesTemplate> = {
  house: {
    functional: 'Deliver a custom-designed single dwelling that meets the client\'s lifestyle requirements, incorporates sustainable design principles, and provides comfortable, functional living spaces optimized for the site and climate.',
    quality: 'Achieve high-quality construction standards with durable materials and finishes appropriate to the design intent. Ensure compliance with NCC, BASIX requirements, and relevant planning controls. Target a minimum 6-star NatHERS energy rating.',
    budget: 'Deliver the project within the approved budget, with transparent cost reporting throughout design and construction phases. Maintain a construction contingency of 5-10% for unforeseen variations. Value engineer design to optimize cost without compromising quality objectives.',
    program: 'Complete design documentation within 12-16 weeks from concept approval. Obtain Development Approval/CDC within 12-20 weeks from lodgement. Complete construction within 40-50 weeks from site commencement to practical completion.'
  },
  apartments: {
    functional: 'Deliver a multi-unit residential development that optimizes site yield while meeting Apartment Design Guide (ADG) requirements, provides high-quality amenity for residents, and creates a positive contribution to the streetscape and local character.',
    quality: 'Achieve compliance with SEPP 65 and Apartment Design Guide across all design criteria. Target minimum 4-star NABERS Energy for Common Areas. Ensure robust construction methodology appropriate to building height and complexity. Provide high-quality common areas and landscaping.',
    budget: 'Deliver the project to meet feasibility targets and investor return requirements. Maintain design stage contingency of 10%, construction contingency of 8-10%. Implement value engineering process during design development to optimize cost efficiency while maintaining design quality and compliance.',
    program: 'Complete feasibility and concept design within 12-16 weeks. Obtain Development Approval within 24-40 weeks (council DA pathway). Complete construction documentation and procurement within 20-24 weeks. Deliver construction and settlement within 2.5-3.5 years from DA lodgement, depending on building scale.'
  },
  fitout: {
    functional: 'Deliver a workplace/commercial fitout that meets operational requirements, supports user productivity and wellbeing, optimizes space efficiency, and provides flexibility for future reconfiguration. Ensure minimal disruption to adjacent tenancies during construction.',
    quality: 'Achieve high-quality finishes and joinery appropriate to tenant branding and budget. Ensure compliance with NCC fitout requirements, landlord standards, and accessibility (DDA) requirements. Target NABERS Indoor Environment (IE) rating if applicable. Integrate AV and ICT systems seamlessly.',
    budget: 'Deliver the fitout within approved budget, typically $1,500-4,000/m² NLA depending on specification level. Maintain design contingency of 5%, construction contingency of 8-10%. Separate FF&E budget to be confirmed based on client requirements.',
    program: 'Complete design development and landlord approvals within 8-10 weeks. Obtain Building Approval/CC within 4-6 weeks. Complete construction within 8-16 weeks depending on area and complexity. Coordinate occupation timing with lease commencement requirements.'
  },
  industrial: {
    functional: 'Deliver an industrial facility optimized for operational efficiency, logistics flow, and future flexibility. Ensure appropriate clearances, loading facilities, and services capacity for intended use. Provide functional office and amenities areas for staff.',
    quality: 'Achieve robust, low-maintenance construction appropriate to industrial use. Ensure compliance with NCC Class 7 and 8 requirements. Provide high-quality hardstand and civil works suitable for heavy vehicle traffic. Consider sustainability features appropriate to industrial typology.',
    budget: 'Deliver the project within budget benchmarks of $800-1,500/m² GFA for standard warehouse/logistics buildings, with cost variation based on office component, height, and services complexity. Maintain construction contingency of 8-10%.',
    program: 'Complete design and approvals within 20-28 weeks. Obtain Construction Certificate within 6-10 weeks of DA approval. Complete construction within 30-50 weeks depending on building size and complexity. Coordinate with tenant fit-out requirements if speculative development.'
  },
  remediation: {
    functional: 'Remediate the site to achieve validation criteria suitable for intended future use (residential, commercial, or recreational). Ensure all contamination is removed or appropriately managed in accordance with NSW EPA guidelines and the Remediation Action Plan.',
    quality: 'Achieve full compliance with NSW Contaminated Land Management Act and EPA guidelines. Obtain Site Audit Statement from NSW EPA-accredited Site Auditor confirming site suitability for intended use. Implement best-practice contamination management, worker safety, and environmental controls.',
    budget: 'Deliver remediation works within budget, noting that contaminated land remediation involves uncertainty. Typical costs range from $50-500/m³ for excavation and disposal depending on contamination type and disposal classification. Maintain contingency of 20-30% due to potential for unexpected contamination extent.',
    program: 'Complete site assessment and RAP within 12-20 weeks. Obtain Site Auditor review and EPA approvals within 6-10 weeks. Complete remediation works within 12-30 weeks depending on contamination extent and treatment methodology. Obtain Site Audit Statement within 8-12 weeks of works completion.'
  }
};
