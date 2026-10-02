"""Rebuilds the picture IQ questions from the two open matrix-reasoning banks (see content/iq/SOURCES.md).

    pip install pillow xlrd openpyxl
    python scripts/iq-collect.py <sandia-dir> <omib-dir>

<sandia-dir>  unpacked Matzen_et_al_2010_norming_stim.zip (github.com/sandialabs/Matrices)
<omib-dir>    osf.io/4km79: "Item Data.xlsx" as items.xlsx, "Construction Elements.zip" unpacked to ce/,
              "Figural Matrices.zip" unpacked to fm/ (only used to verify the redrawn items)

Writes the pictures to .media/iq/ (the local media store, not in git; `pnpm media:push` sends it to the server)
and the questions to content/iq/pictures.yaml. Every item is a question picture plus one answers picture:
8 square cells, 4 columns x 2 rows, read left to right.
"""
import glob
import os
import random
import re
import sys
from collections import defaultdict

import openpyxl
import xlrd
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, ".media", "iq")
PROMPT = "Boʻsh katakka qaysi shakl mos keladi?"


def difficulty(p):
    """Share of people who solved it -> 1-5. Only the starting rating: items calibrate themselves afterwards."""
    return 1 if p >= 0.85 else 2 if p >= 0.7 else 3 if p >= 0.5 else 4 if p >= 0.3 else 5


def sandia(src):
    sheet = xlrd.open_workbook(os.path.join(src, "Matzen_et_al_2010_norming_stimuli.xls")).sheets()[0]
    rows = [sheet.row_values(r) for r in range(sheet.nrows)]
    rows = [r for r in rows if isinstance(r[4], float)]
    files = {os.path.splitext(os.path.basename(f))[0]: f for f in glob.glob(os.path.join(src, "*", "*.[pP][nN][gG]"))}

    seen, items = set(), []
    for relations, subtype, structure, name, answer, solved in rows:
        name = name.strip()
        # The sheet lists A4_1 twice; the second row is A4_4 (checked against the pictures).
        if name in seen and name == "A4_1":
            name = "A4_4"
        assert name not in seen and name in files and name + "_Answers" in files, name
        seen.add(name)
        items.append({"relations": relations.strip(), "subtype": subtype.strip(), "structure": structure.strip(), "name": name, "answer": int(answer) - 1, "solved": solved})
    assert len(items) == 840

    # Each puzzle was shown to only 4 people, so its own score is noisy: average it with the score of its problem type.
    groups = defaultdict(list)
    for i in items:
        groups[i["relations"], i["subtype"]].append(i["solved"])
    order = ["One Relation", "Two Relations", "Three Relations", "Logic"]
    items.sort(key=lambda i: (order.index(i["relations"]), i["name"]))

    os.makedirs(os.path.join(OUT, "sandia"), exist_ok=True)
    out = []
    for n, i in enumerate(items, 1):
        key = f"s{n:03d}"
        question = Image.open(files[i["name"]]).convert("RGB")
        # The answer sheet is 4 x 2 cells of 100 px between 2 px grid lines. The app draws its own frame
        # around every answer, so the lines are cut out: the cells end up edge to edge.
        sheet = Image.open(files[i["name"] + "_Answers"]).convert("RGB")
        assert sheet.size == (410, 206), i["name"]
        answers = Image.new("RGB", (400, 200), "white")
        for cell in range(8):
            x, y = 2 + 102 * (cell % 4), 2 + 102 * (cell // 4)
            answers.paste(sheet.crop((x, y, x + 100, y + 100)), (100 * (cell % 4), 100 * (cell // 4)))
        for suffix, image in (("", question), ("-answers", answers)):
            # 2-4 flat colours, no antialiasing: a palette PNG is lossless here and ~10x smaller.
            image.quantize(colors=16, dither=Image.Dither.NONE).save(os.path.join(OUT, "sandia", key + suffix + ".png"), optimize=True)
        group = groups[i["relations"], i["subtype"]]
        p = (i["solved"] + sum(group) / len(group)) / 2
        out.append({
            "id": f"iq-matrix-{key}", "difficulty": difficulty(p), "image": f"iq/sandia/{key}.png", "optionsImage": f"iq/sandia/{key}-answers.png",
            "answer": i["answer"],
        })
    return out


CELL = 100
GAP = 10


def omib(src):
    def marks(svg):
        """The drawing itself: polygon/rect tags without their generated ids."""
        return [re.sub(r' id="[^"]*"', "", tag) for tag in re.findall(r"<(?:polygon|rect|circle|line|path)\b[^>]*>", svg) if "data-v-" not in tag]

    shapes = []
    for n in range(1, 21):
        found = marks(open(os.path.join(src, "ce", f"Option{n}.svg"), encoding="utf8").read())
        assert len(found) == 1, n
        shapes.append(found[0].rstrip(">").rstrip("/") + "/>")

    def cell(code, x, y, frame):
        body = "".join(shape for bit, shape in zip(code, shapes) if bit == "1")
        return f'<svg x="{x}" y="{y}" width="{CELL}" height="{CELL}" viewBox="0 0 100 100">{frame}{body}</svg>'

    def picture(w, h, body):
        return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}"><rect width="{w}" height="{h}" fill="#fff"/>{body}</svg>\n'

    step = CELL + GAP
    side = 3 * CELL + 2 * GAP + 2

    def question(codes):
        frame = '<rect width="100" height="100" fill="#fff" stroke="#000"/>'
        return picture(side, side, "".join(cell(c, 1 + (k % 3) * step, 1 + (k // 3) * step, frame) for k, c in enumerate(codes)) + question_mark)

    def answers(codes):
        # No frames and no gaps: the app cuts this into 4 x 2 equal cells and frames each one itself.
        return picture(4 * CELL, 2 * CELL, "".join(cell(c, (k % 4) * CELL, (k // 4) * CELL, "") for k, c in enumerate(codes)))

    question_mark = (
        f'<svg x="{1 + 2 * step}" y="{1 + 2 * step}" width="{CELL}" height="{CELL}" viewBox="0 0 100 100">'
        '<rect width="100" height="100" fill="#fff" stroke="#000" stroke-dasharray="6 4"/>'
        '<text x="50" y="68" font-family="sans-serif" font-size="52" font-weight="700" text-anchor="middle">?</text></svg>'
    )

    rows = list(openpyxl.load_workbook(os.path.join(src, "items.xlsx")).active.iter_rows(min_row=2, values_only=True))
    assert len(rows) == 220
    os.makedirs(os.path.join(OUT, "omib"), exist_ok=True)
    out = []
    for row in rows:
        number, solved, solution, cells = row[1], row[9], row[13], row[14].split(",")
        assert len(cells) == 9 and cells[8] == solution and all(len(c) == 20 for c in cells), number

        # The redrawn matrix must be the published one: same polygons in the same cells.
        published = open(os.path.join(src, "fm", f"Item_{number}.svg"), encoding="utf8").read()
        for k in range(8):
            got = re.search(rf'id="i_\d+_mat{k + 1}".*?</svg>', published, re.S).group(0)
            assert sorted(m.rstrip(">") + "/>" for m in marks(got)) == sorted(shape for bit, shape in zip(cells[k], shapes) if bit == "1"), (number, k)

        # The bank is "build the answer yourself", so it has no wrong options. Ours: other cells of the same matrix,
        # then the answer with one or two of the elements this matrix uses switched on/off.
        rng = random.Random(number)
        used = sorted({b for c in cells for b in range(20) if c[b] == "1"})
        for b in list(used):  # elements come in families of four (one per corner/side)
            used += [g for g in range(b // 4 * 4, b // 4 * 4 + 4) if g not in used]
        flip = lambda code, bits: "".join(("0" if c == "1" else "1") if b in bits else c for b, c in enumerate(code))
        others = [c for c in dict.fromkeys(cells[:8]) if c != solution]
        rng.shuffle(others)
        one = [flip(solution, {b}) for b in used]
        two = [flip(solution, {a, b}) for a in used for b in used if a < b]
        rng.shuffle(one)
        rng.shuffle(two)
        options = [solution]
        for candidate in others[:3] + one[:3] + two + one[3:] + others[3:]:
            if len(options) == 8:
                break
            if candidate not in options:
                options.append(candidate)
        assert len(options) == 8, number
        rng.shuffle(options)

        key = f"o{number:03d}"
        with open(os.path.join(OUT, "omib", key + ".svg"), "w", encoding="utf8", newline="\n") as f:
            f.write(question(cells[:8]))
        with open(os.path.join(OUT, "omib", key + "-answers.svg"), "w", encoding="utf8", newline="\n") as f:
            f.write(answers(options))
        out.append({
            "id": f"iq-matrix-{key}", "difficulty": difficulty(solved), "image": f"iq/omib/{key}.svg", "optionsImage": f"iq/omib/{key}-answers.svg",
            "answer": options.index(solution),
        })
    return out


def main():
    items = sandia(sys.argv[1]) + omib(sys.argv[2])
    lines = [
        "# Rasmli IQ savollari (matritsalar) — scripts/iq-collect.py yozgan. Manbalar va litsenziyalar: SOURCES.md",
        "# image / optionsImage.src — media omboridagi rasm yoʻli (pnpm media:push). optionsImage — barcha javoblar bitta rasmda:",
        "# columns x rows kvadrat katak, chapdan oʻngga. answer — toʻgʻri katak indeksi (0 dan boshlanadi).",
        "items:",
    ]
    for i in items:
        lines += [
            f"  - id: {i['id']}",
            "    category: matrix",
            f"    difficulty: {i['difficulty']}",
            f"    prompt: {PROMPT}",
            f"    image: {i['image']}",
            "    optionsImage:",
            f"      src: {i['optionsImage']}",
            "      columns: 4",
            "      rows: 2",
            f"    answer: {i['answer']}",
        ]
    with open(os.path.join(ROOT, "content", "iq", "pictures.yaml"), "w", encoding="utf8", newline="\n") as f:
        f.write("\n".join(lines) + "\n")
    print(f"{len(items)} items")


main()
