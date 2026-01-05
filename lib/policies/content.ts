/**
 * Policy Content Definitions
 * All policy texts for modals and acceptance flows
 */

export interface PolicyDefinition {
  key: string
  version: string
  title: string
  content: string
}

export const POLICIES: Record<string, PolicyDefinition> = {
  // Renter Policies
  insurance_election_disclaimer: {
    key: 'insurance_election_disclaimer',
    version: '1.0',
    title: 'Insurance Election Disclaimer',
    content: `
**Platform Protection Plans vs BYOI**

By proceeding, you acknowledge that:

- **Platform Protection Plans**: Managed by the platform. Coverage details are provided during selection.
- **BYOI (Bring Your Own Insurance)**: You are responsible for ensuring your insurance covers peer-to-peer rentals. The platform does not verify your insurance coverage.
- You must accept liability terms if selecting BYOI.
- Coverage selection is final and cannot be changed after booking confirmation.

**Your Responsibility**
- Verify that your insurance policy covers peer-to-peer vehicle rentals
- Understand your deductible and coverage limits
- Keep your insurance policy active and valid for the entire rental period

By clicking "Accept", you acknowledge that you have read and understand this disclaimer.
    `.trim(),
  },
  byoi_liability_acceptance: {
    key: 'byoi_liability_acceptance',
    version: '1.0',
    title: 'BYOI Liability Acceptance',
    content: `
**Bring Your Own Insurance (BYOI) Liability Terms**

By selecting BYOI, you acknowledge:

- You are responsible for providing valid insurance coverage
- Your insurance policy must cover peer-to-peer vehicle rentals
- You are responsible for all damages and liability not covered by your insurance
- The platform is not responsible for insurance coverage verification
- You must maintain active insurance for the entire rental period

**Important**
- Failure to maintain valid insurance may result in immediate termination of the rental
- You are liable for all costs not covered by your insurance policy
- The vehicle owner may pursue additional remedies if insurance is insufficient

By clicking "Accept", you acknowledge full responsibility for insurance coverage and liability.
    `.trim(),
  },
  platform_rules_renter: {
    key: 'platform_rules_renter',
    version: '1.0',
    title: 'Platform Rules for Renters',
    content: `
**Renter Platform Rules**

By using this platform, you agree to:

- Return vehicles on time and in the condition received
- Report any issues or damage immediately
- Follow all traffic laws and vehicle usage restrictions
- Not use vehicles for illegal activities
- Respect vehicle owners' property and instructions
- Communicate respectfully with vehicle owners

**Prohibited Activities**
- Smoking in vehicles (unless explicitly permitted)
- Transporting pets (unless explicitly permitted)
- Off-road use (unless vehicle is designed for such use)
- Towing (unless vehicle is equipped)
- Racing or reckless driving
- Transporting illegal substances

**Consequences**
Violations may result in immediate rental termination, fees, and permanent platform ban.

By clicking "Accept", you agree to follow all platform rules.
    `.trim(),
  },
  recall_badge_disclaimer: {
    key: 'recall_badge_disclaimer',
    version: '1.0',
    title: 'Recall Information Disclaimer',
    content: `
**Vehicle Recall Information**

Recall information is provided for transparency based on public data from the National Highway Traffic Safety Administration (NHTSA).

**Important Notes**
- Recall information is informational only
- The platform does not determine vehicle safety or fitness
- Always verify vehicle condition before booking
- Dealers are responsible for addressing recalls
- This information may not be comprehensive or up-to-date

**Your Responsibility**
- Review recall information before booking
- Ask dealers about recall status if concerned
- Make informed decisions about vehicle rentals

By clicking "Accept", you acknowledge that recall information is provided for informational purposes only.
    `.trim(),
  },

  // Dealer Policies
  dealer_listing_accuracy_terms: {
    key: 'dealer_listing_accuracy_terms',
    version: '1.0',
    title: 'Listing Accuracy Terms',
    content: `
**Vehicle Listing Accuracy Requirements**

By publishing a listing, you certify that:

- All information provided is accurate and truthful
- Vehicle condition, features, and specifications are correctly represented
- Photos accurately represent the vehicle's current condition
- Pricing is transparent and includes all required fees
- Vehicle is legally owned or authorized for listing

**Prohibited Practices**
- Misrepresenting vehicle condition, features, or specifications
- Using misleading or outdated photos
- Hiding defects or damage
- False advertising or deceptive practices

**Consequences**
Inaccurate listings may result in listing removal, account restrictions, or permanent ban.

By clicking "Accept", you certify that your listing is accurate and truthful.
    `.trim(),
  },
  dealer_complaint_terms: {
    key: 'dealer_complaint_terms',
    version: '1.0',
    title: 'Dealer Complaint Terms',
    content: `
**Complaint Submission Terms**

By submitting a complaint, you acknowledge:

- Complaints are for documentation and platform policy resolution only
- The platform does not determine legal fault or liability
- All information provided must be truthful and factual
- False or malicious complaints may result in account restrictions
- Complaints are reviewed by platform administrators

**What Happens Next**
- Your complaint will be reviewed by platform staff
- The renter will be notified and may respond
- Resolution follows platform policies and procedures
- Legal matters are not resolved through this process

**No Confrontation Policy**
- Do not contact renters directly about complaints
- Use the platform's messaging system only
- Threatening or harassing behavior is prohibited

By clicking "Accept", you agree to these complaint terms and the no-confrontation policy.
    `.trim(),
  },
  review_honesty_policy: {
    key: 'review_honesty_policy',
    version: '1.0',
    title: 'Review Honesty Policy',
    content: `
**Review Honesty Policy**

By submitting a review, you agree:

- Reviews must be truthful and based on actual experience
- Reviews should be factual and free of personal attacks
- No false, defamatory, or malicious content
- Reviews help other dealers make informed decisions
- Reviews are visible to other dealers (not public)

**Prohibited Content**
- Personal information (PII) about renters
- False or misleading statements
- Threats, harassment, or abusive language
- Reviews unrelated to the rental experience

**Moderation**
- Reviews may be reviewed for policy compliance
- Violations may result in review removal or account restrictions

By clicking "Accept", you agree to write honest, factual reviews.
    `.trim(),
  },
  no_confrontation_policy: {
    key: 'no_confrontation_policy',
    version: '1.0',
    title: 'No Confrontation Policy',
    content: `
**No Confrontation Policy**

The platform prohibits direct confrontation between dealers and renters regarding disputes or complaints.

**Policy Requirements**
- Use platform messaging systems only
- Do not contact renters directly about complaints or disputes
- Do not use external communication channels for complaint resolution
- All communications must go through the platform

**Prohibited Behavior**
- Threatening or harassing renters
- Contacting renters outside the platform about complaints
- Publicly posting complaints or disputes
- Retaliatory actions

**Consequences**
Violations may result in immediate account suspension or permanent ban.

By clicking "Accept", you agree to follow the no-confrontation policy.
    `.trim(),
  },
  dealer_listing_requirements_v1: {
    key: 'dealer_listing_requirements_v1',
    version: '1.0',
    title: 'Listing Requirements',
    content: `
**Vehicle Listing Requirements**

By publishing a listing, you certify that:

**Year Requirement**
- Vehicle year must be 2010 or newer (Platform minimum)

**Title Type**
- Only clean titles are allowed
- Platform policy prohibits salvage, flood, and rebuilt titles

**Inspection**
- Vehicle must have passed inspection to be published
- Failed inspection vehicles cannot be listed

**Photos and Description**
- At least 3 photos are required
- All information must be accurate and truthful
- Photos must accurately represent the vehicle's current condition

**Prohibited Practices**
- Listing vehicles with year < 2010
- Using salvage, flood, or rebuilt titles
- Publishing vehicles with failed inspection
- Misrepresenting vehicle condition or features

**Consequences**
Inaccurate listings may result in listing removal, account restrictions, or permanent ban.

By clicking "Accept", you certify that your listing meets all requirements and contains accurate information.
    `.trim(),
  },
}

export function getPolicy(key: string, version: string): PolicyDefinition | null {
  return POLICIES[key] || null
}

export function getAllPolicies(): PolicyDefinition[] {
  return Object.values(POLICIES)
}
