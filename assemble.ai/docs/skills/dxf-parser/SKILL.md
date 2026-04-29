---
name: dxf-parser
tier: 2
description: Parse DXF files using ezdxf to extract structured geometry, layers, text, dimensions, hatches, and block references for design review and NCC compliance analysis.
agents: [design]
---

# DXF Parser Skill

## When to Load

Load this skill when:
- A `.dxf` or `.dwg` file is detected in `docs/design/`
- The user asks for a geometric or layer-based design review
- NCC compliance checking requires measured distances, travel distances, room areas, or fire compartmentation tracing
- A drawing comparison is being run and a DXF source is available

## What This Skill Does

This skill runs a Python script using `ezdxf` to extract structured data from a DXF file. The Design Agent then reasons about the extracted data — not the visual image.

**Confidence level:** Medium-high. Reliable for geometry and layer-based analysis. Material properties are inferred from layer names and hatch patterns — verify against the specification.

**Required disclaimer when reporting results:**
> "This review is based on DXF file analysis. Measurements and layer-based assessments are reliable. Material properties are inferred from layer names and hatch patterns — verify against the specification for definitive compliance."

---

## Extraction Script

Run the following Python script to extract data from the DXF file. Save output as `<drawing-name>-extracted.json` in `docs/design/`.

```python
import ezdxf
import json
import sys
from pathlib import Path

def extract_dxf(filepath):
    doc = ezdxf.readfile(filepath)
    msp = doc.modelspace()
    
    result = {
        "file": Path(filepath).name,
        "layers": [],
        "text_entities": [],
        "dimensions": [],
        "hatches": [],
        "blocks": [],
        "polylines": [],
        "lines": []
    }
    
    # Layers
    for layer in doc.layers:
        result["layers"].append({
            "name": layer.dxf.name,
            "color": layer.dxf.color,
            "linetype": getattr(layer.dxf, "linetype", "CONTINUOUS"),
            "is_off": layer.is_off(),
            "is_frozen": layer.is_frozen()
        })
    
    # Entity counts per layer
    layer_counts = {}
    for entity in msp:
        ln = entity.dxf.layer
        layer_counts[ln] = layer_counts.get(ln, 0) + 1
    for layer in result["layers"]:
        layer["entity_count"] = layer_counts.get(layer["name"], 0)
    
    # Text entities (TEXT and MTEXT)
    for entity in msp.query("TEXT MTEXT"):
        text = entity.dxf.text if entity.dxftype() == "TEXT" else entity.text
        insert = entity.dxf.insert if hasattr(entity.dxf, "insert") else None
        result["text_entities"].append({
            "type": entity.dxftype(),
            "layer": entity.dxf.layer,
            "text": str(text).strip(),
            "x": round(float(insert[0]), 2) if insert else None,
            "y": round(float(insert[1]), 2) if insert else None
        })
    
    # Dimensions
    for entity in msp.query("DIMENSION"):
        result["dimensions"].append({
            "layer": entity.dxf.layer,
            "measurement": round(entity.dxf.actual_measurement, 2) if hasattr(entity.dxf, "actual_measurement") else None,
            "text": getattr(entity.dxf, "text", ""),
            "defpoint": (round(entity.dxf.defpoint[0], 2), round(entity.dxf.defpoint[1], 2)) if hasattr(entity.dxf, "defpoint") else None
        })
    
    # Hatches
    for entity in msp.query("HATCH"):
        result["hatches"].append({
            "layer": entity.dxf.layer,
            "pattern_name": entity.dxf.pattern_name,
            "solid_fill": entity.dxf.solid_fill
        })
    
    # Block references (INSERT)
    for entity in msp.query("INSERT"):
        result["blocks"].append({
            "layer": entity.dxf.layer,
            "name": entity.dxf.name,
            "x": round(float(entity.dxf.insert[0]), 2),
            "y": round(float(entity.dxf.insert[1]), 2),
            "x_scale": round(getattr(entity.dxf, "xscale", 1.0), 3),
            "y_scale": round(getattr(entity.dxf, "yscale", 1.0), 3)
        })
    
    # Polylines (LWPOLYLINE and POLYLINE)
    for entity in msp.query("LWPOLYLINE POLYLINE"):
        try:
            pts = [(round(p[0], 2), round(p[1], 2)) for p in entity.get_points()]
            result["polylines"].append({
                "layer": entity.dxf.layer,
                "is_closed": entity.is_closed,
                "point_count": len(pts),
                "points": pts[:20]  # cap at 20 for context efficiency
            })
        except Exception:
            pass
    
    # Lines
    for entity in msp.query("LINE"):
        result["lines"].append({
            "layer": entity.dxf.layer,
            "start": (round(entity.dxf.start[0], 2), round(entity.dxf.start[1], 2)),
            "end": (round(entity.dxf.end[0], 2), round(entity.dxf.end[1], 2))
        })
    
    return result

if __name__ == "__main__":
    filepath = sys.argv[1]
    data = extract_dxf(filepath)
    out_path = Path(filepath).with_suffix(".extracted.json")
    with open(out_path, "w") as f:
        json.dump(data, f, indent=2)
    print(f"Extracted to: {out_path}")
    print(f"Layers: {len(data['layers'])}")
    print(f"Text entities: {len(data['text_entities'])}")
    print(f"Dimensions: {len(data['dimensions'])}")
    print(f"Hatches: {len(data['hatches'])}")
    print(f"Block references: {len(data['blocks'])}")
    print(f"Polylines: {len(data['polylines'])}")
```

**Run with:**
```bash
python system/skills/dxf-parser/extract.py docs/design/<filename>.dxf
```

---

## Australian Layer Naming Conventions

Use these conventions to interpret layer semantics from extracted layer names:

### Architectural Layers
| Layer Pattern | Meaning |
|--------------|---------|
| `A-WALL-EXT` | External wall |
| `A-WALL-INT` | Internal wall |
| `A-WALL-FIRE` | Fire-rated wall |
| `A-DOOR` | Door elements |
| `A-WIND` | Window elements |
| `A-ROOM` | Room boundaries |
| `A-AREA` | Area boundaries |
| `A-STAIR` | Stair elements |
| `A-LIFT` | Lift/elevator shafts |
| `A-RAMP` | Ramp elements |
| `A-ANNO` | Annotations |
| `A-DIMS` | Dimensions |
| `A-TEXT` | Text notes |
| `A-GRID` | Grid lines |
| `A-SETOUT` | Set-out points |

### Structural Layers
| Layer Pattern | Meaning |
|--------------|---------|
| `S-COL` | Structural columns |
| `S-BEAM` | Structural beams |
| `S-SLAB` | Slab outlines |
| `S-WALL` | Structural walls |
| `S-FOUND` | Foundations |

### Services Layers
| Layer Pattern | Meaning |
|--------------|---------|
| `M-DUCT` | Mechanical ductwork |
| `M-EQUIP` | Mechanical equipment |
| `E-LIGHT` | Electrical lighting |
| `E-POWER` | Power outlets |
| `H-PIPE` | Hydraulic pipes |
| `F-SPRNK` | Fire sprinklers |
| `F-PIPE` | Fire pipework |

### Hatch Pattern Meanings
| Pattern Name | Material |
|-------------|---------|
| `AR-CONC` | Concrete |
| `AR-BRSTD` | Brick (stretcher bond) |
| `AR-BRHDR` | Brick (header bond) |
| `INSUL` | Insulation |
| `AR-SAND` | Sand / fill |
| `EARTH` | Earth / soil |
| `STEEL` | Steel sections |
| `AR-PARQ` | Timber parquet |
| `DOTS` | Acoustic fill |

---

## What to Analyse After Extraction

### 1. Layer Audit
Review all layers with entity counts. Flag:
- Fire-rated wall layers (look for `FIRE`, `FRL` in layer name)
- Room boundary layers
- Services layers affecting compliance
- Unusual or non-standard layer names (flag to user — may indicate non-standard CAD standards)

### 2. Room Areas
For closed polylines on room boundary layers (`A-ROOM`, `A-AREA`):
- Calculate enclosed area using the Shoelace formula on polyline coordinates
- Compare against brief requirements and NCC minimum room dimensions
- Report as a room schedule table

**Area calculation (Shoelace formula):**
```python
def polyline_area(points):
    n = len(points)
    area = 0
    for i in range(n):
        j = (i + 1) % n
        area += points[i][0] * points[j][1]
        area -= points[j][0] * points[i][1]
    return abs(area) / 2
```

### 3. Travel Distances
For NCC egress compliance, trace corridor polylines from furthest point to nearest exit:
- Identify corridor layers (`A-CORR`, `A-EGRESS`, or similar)
- Trace polyline lengths using Euclidean distance between consecutive points
- Compare against NCC maximum travel distances (typically 20m to exit in Class 2, 40m in sprinklered buildings)

**Distance calculation:**
```python
import math
def polyline_length(points):
    total = 0
    for i in range(len(points) - 1):
        dx = points[i+1][0] - points[i][0]
        dy = points[i+1][1] - points[i][1]
        total += math.sqrt(dx**2 + dy**2)
    return total
```

### 4. Fire Compartmentation
- Identify all lines and polylines on fire-rated wall layers
- Check for continuity — gaps in fire compartment lines are non-compliance indicators
- Cross-reference door blocks on fire-rated layers (should be fire-rated doors)

### 5. Corridor and Door Widths
- Measure minimum corridor width from parallel wall lines
- Check door block x_scale against standard block dimensions (typically 900mm = 1.0 scale)
- DDA minimum: 850mm clear for doors, 1000mm for accessible corridors

### 6. Dimension Verification
- Cross-check extracted dimension values against calculated distances
- Flag discrepancies (may indicate drawing errors or scaling issues)

---

## Output Format

After analysis, report as:

```
DXF EXTRACTION SUMMARY
Drawing: [filename] Rev [X]
Extraction date: [date]
Scale: [1:X]

LAYER AUDIT
[table of layers with entity counts and semantic interpretation]

ROOM SCHEDULE (from polyline areas)
| Room | Layer | Calculated Area (m²) | Brief Requirement | Status |
|------|-------|----------------------|-------------------|--------|

DIMENSIONS EXTRACTED
[count] dimension values found. Key measurements:
[list notable dimensions — setbacks, widths, heights]

HATCH ANALYSIS
[table of hatch patterns and their wall/material inference]

BLOCK REFERENCES
[count] block insertions. Notable blocks:
[list door blocks, lift symbols, stair symbols with locations]

COMPLIANCE FLAGS
[list any items requiring follow-up — gaps in fire lines, narrow corridors, 
missing required rooms, dimensions below minimums]
```

---

## DWG Files

If a `.dwg` file is provided instead of `.dxf`:
1. Advise user: "DWG is a proprietary format — I need a DXF export to parse it. Most CAD software can export DXF from DWG via File → Export or Save As."
2. Alternatively, run `ODAFileConverter` (if available) to convert DWG → DXF before running the extraction script.

## Fallback if ezdxf Not Available

If Python/ezdxf is not available in the environment:
1. State clearly: "DXF parsing requires Python with ezdxf installed. Falling back to PDF vision review."
2. Load PDF review approach and apply vision-based analysis with appropriate low-confidence disclaimers.
3. Recommend the user install ezdxf: `pip install ezdxf`
