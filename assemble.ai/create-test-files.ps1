# Create test files for construction project
$testDir = "test-files"

# Architectural Drawings (PDFs)
$architecturalDrawings = @(
    "A1.01-Civil-Site-Plan-Rev01.pdf",
    "A1.02-Site-Details-Rev02.pdf",
    "A1.03-Grading-Plan-Rev01.pdf",
    "A2.01-Floor-Plan-Level-1-Rev03.pdf",
    "A2.02-Floor-Plan-Level-2-Rev02.pdf",
    "A2.03-Floor-Plan-Level-3-Rev01.pdf",
    "A3.01-Building-Elevations-North-Rev02.pdf",
    "A3.02-Building-Elevations-South-Rev02.pdf",
    "A3.03-Building-Elevations-East-Rev01.pdf",
    "A3.04-Building-Elevations-West-Rev01.pdf",
    "A4.01-Building-Sections-A-A-Rev02.pdf",
    "A4.02-Building-Sections-B-B-Rev01.pdf",
    "A5.01-Reflected-Ceiling-Plans-Rev02.pdf",
    "A6.01-Roof-Plan-Rev01.pdf",
    "A7.01-Interior-Elevations-Rev02.pdf"
)

# Engineering Drawings (PDFs)
$engineeringDrawings = @(
    "S1.01-Foundation-Plan-Rev03.pdf",
    "S1.02-Foundation-Details-Rev02.pdf",
    "S2.01-Framing-Plan-Level-1-Rev02.pdf",
    "S2.02-Framing-Plan-Level-2-Rev01.pdf",
    "S3.01-Schedule-of-Columns-Rev01.pdf",
    "M1.01-HVAC-Plan-Level-1-Rev02.pdf",
    "M1.02-HVAC-Plan-Level-2-Rev01.pdf",
    "E1.01-Electrical-Power-Plan-Rev02.pdf",
    "E1.02-Electrical-Lighting-Plan-Rev01.pdf",
    "P1.01-Plumbing-Plan-Level-1-Rev01.pdf",
    "P1.02-Plumbing-Schedule-Rev01.pdf"
)

# Specifications (PDFs)
$specifications = @(
    "03300-Cast-in-Place-Concrete.pdf",
    "04200-Unit-Masonry.pdf",
    "06100-Rough-Carpentry.pdf",
    "07240-Insulation.pdf",
    "08100-Doors-and-Frames.pdf",
    "08400-Entrances-and-Storefronts.pdf",
    "09250-Gypsum-Board-Assemblies.pdf",
    "09650-Resilient-Flooring.pdf",
    "09900-Painting.pdf"
)

# Documents (DOCX/DOC)
$documents = @(
    "Contract-Agreement-Main-Contract.docx",
    "Meeting-Minutes-2025-01-15.docx",
    "Meeting-Minutes-2025-02-01.docx",
    "Subcontractor-Agreement-Plumbing.docx",
    "Subcontractor-Agreement-Electrical.docx",
    "RFI-001-Foundation-Depth.doc",
    "RFI-002-Backfill-Material.doc",
    "Change-Order-CO-001-Structural-Changes.docx",
    "Change-Order-CO-002-HVAC-Upgrades.docx",
    "Letter-to-Owner-Progress-Update.doc"
)

# Spreadsheets (XLSX/CSV)
$spreadsheets = @(
    "Construction-Schedule-Master.xlsx",
    "RFI-Log.xlsx",
    "Subcontractor-List.xlsx",
    "Material-Takeoff-Summary.xlsx",
    "Budget-Tracking.xlsx",
    "Payroll-Schedule.xlsx"
)

# Images (JPG/PNG)
$images = @(
    "Progress-Photo-Excavation-2025-01-10.jpg",
    "Progress-Photo-Foundation-2025-01-15.jpg",
    "Progress-Photo-Framing-2025-02-01.png",
    "Progress-Photo-Insulation-2025-02-10.jpg",
    "Progress-Photo-Drywall-2025-02-15.jpg",
    "Site-Condition-Pre-Construction.jpg",
    "Material-Sample-Concrete.jpg",
    "Building-Permit-Approval.png",
    "Inspection-Report-Signoff.jpg",
    "Final-Occupancy-Certificate.png"
)

# Text files (TXT)
$textFiles = @(
    "Daily-Field-Report-2025-01-15.txt",
    "Safety-Checklist-Weekly.txt",
    "Equipment-List.txt",
    "Contact-Directory.txt"
)

# Permits and Certificates (PDF)
$permits = @(
    "Building-Permit-Application.pdf",
    "Certificate-of-Occupancy.pdf",
    "Water-Connection-Permit.pdf",
    "Sewer-Connection-Permit.pdf",
    "Electrical-Permit.pdf",
    "Plumbing-Permit.pdf"
)

# Submittals (PDF)
$submittals = @(
    "Submittal-001-Concrete-Mix-Design.pdf",
    "Submittal-002-Rebar-Schedule.pdf",
    "Submittal-003-Structural-Steel.pdf",
    "Submittal-004-HVAC-Equipment.pdf",
    "Submittal-005-Electrical-Panel.pdf"
)

# Correspondence (PDF/DOC)
$correspondence = @(
    "Notice-to-Proceed.pdf",
    "Payment-Application-001.pdf",
    "Lien-Waiver-General-Contractor.pdf",
    "Owner-Change-Directive-001.pdf",
    "Architect-Supplemental-Instruction-001.pdf"
)

# Create all the files
Write-Host "Creating architectural drawings..."
foreach ($file in $architecturalDrawings) {
    New-Item -Path "$testDir\$file" -ItemType File -Force | Out-Null
}

Write-Host "Creating engineering drawings..."
foreach ($file in $engineeringDrawings) {
    New-Item -Path "$testDir\$file" -ItemType File -Force | Out-Null
}

Write-Host "Creating specifications..."
foreach ($file in $specifications) {
    New-Item -Path "$testDir\$file" -ItemType File -Force | Out-Null
}

Write-Host "Creating documents..."
foreach ($file in $documents) {
    New-Item -Path "$testDir\$file" -ItemType File -Force | Out-Null
}

Write-Host "Creating spreadsheets..."
foreach ($file in $spreadsheets) {
    New-Item -Path "$testDir\$file" -ItemType File -Force | Out-Null
}

Write-Host "Creating images..."
foreach ($file in $images) {
    New-Item -Path "$testDir\$file" -ItemType File -Force | Out-Null
}

Write-Host "Creating text files..."
foreach ($file in $textFiles) {
    New-Item -Path "$testDir\$file" -ItemType File -Force | Out-Null
    # Add some content to text files
    Set-Content -Path "$testDir\$file" -Value "This is a test file for $file"
}

Write-Host "Creating permits..."
foreach ($file in $permits) {
    New-Item -Path "$testDir\$file" -ItemType File -Force | Out-Null
}

Write-Host "Creating submittals..."
foreach ($file in $submittals) {
    New-Item -Path "$testDir\$file" -ItemType File -Force | Out-Null
}

Write-Host "Creating correspondence..."
foreach ($file in $correspondence) {
    New-Item -Path "$testDir\$file" -ItemType File -Force | Out-Null
}

$count = (Get-ChildItem -Path $testDir).Count
Write-Host "Success! Created $count test files in $testDir directory"
