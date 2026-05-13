import type { SymptomLog } from "./db";

export type HealthFlag = {
  id: string;
  name: string;
  icon: string;
  severity: "watch" | "discuss";
  summary: string;
  detail: string;
  why_overlooked: string;
};

export function analyzeFlags(logs: SymptomLog[]): HealthFlag[] {
  if (logs.length < 5) return [];

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const recent = logs.filter((l) => new Date(l.date + "T12:00:00") >= cutoff);
  if (recent.length < 3) return [];

  const flags: HealthFlag[] = [];

  const count = (symptom: string) =>
    recent.filter((l) => l.symptoms.includes(symptom)).length;

  const heavyFlow = recent.filter((l) => l.flow_level === "heavy").length;
  const mediumFlow = recent.filter((l) => l.flow_level === "medium").length;
  const significantFlow = heavyFlow + mediumFlow;

  if (count("cramps") >= 4 && (count("back_pain") >= 3 || count("nausea") >= 3) && significantFlow >= 3) {
    flags.push({
      id: "endometriosis",
      name: "Endometriosis Indicators",
      icon: "🔴",
      severity: "discuss",
      summary: "Frequent cramps, back pain, and moderate-to-heavy flow are key endometriosis signals.",
      detail:
        "Endometriosis affects 1 in 10 women but takes an average of 7–10 years to diagnose. Tissue similar to the uterine lining grows outside it, causing severe cramps, back pain, and heavy bleeding. It's chronic but manageable with the right care.",
      why_overlooked:
        "Severe period pain is routinely dismissed as 'normal' — it isn't. You deserve a proper diagnosis.",
    });
  }

  if (count("mood_swings") >= 5 && (count("insomnia") >= 3 || count("fatigue") >= 5)) {
    flags.push({
      id: "pmdd",
      name: "PMDD Indicators",
      icon: "🟣",
      severity: "discuss",
      summary: "Severe mood changes and sleep disruption tied to your cycle may indicate PMDD.",
      detail:
        "Premenstrual Dysphoric Disorder (PMDD) affects ~5% of women and is far more severe than PMS. It significantly disrupts daily life but responds well to treatment once diagnosed. Ask your doctor about it by name.",
      why_overlooked:
        "PMDD is routinely dismissed as 'just being emotional.' It is a recognized medical condition.",
    });
  }

  if (heavyFlow >= 4 && count("fatigue") >= 5) {
    flags.push({
      id: "iron_deficiency",
      name: "Iron Deficiency Risk",
      icon: "🟡",
      severity: "watch",
      summary: "Heavy periods paired with persistent fatigue are the classic signs of iron deficiency anemia.",
      detail:
        "Consistently heavy periods can cause significant blood loss. Combined with ongoing fatigue, this pattern commonly leads to iron deficiency anemia — easily confirmed with a simple blood test and treated with supplementation.",
      why_overlooked:
        "Period fatigue is assumed to be normal, masking a correctable and very common deficiency.",
    });
  }

  if (heavyFlow >= 4 && count("cramps") >= 4 && count("bloating") >= 4) {
    flags.push({
      id: "adenomyosis",
      name: "Adenomyosis Indicators",
      icon: "🟠",
      severity: "discuss",
      summary: "Heavy bleeding, severe cramps, and persistent bloating together may indicate adenomyosis.",
      detail:
        "Adenomyosis occurs when uterine lining tissue grows into the uterine muscle wall, causing heavy bleeding, intense cramps, and bloating. It's often confused with fibroids or endometriosis and requires imaging to confirm.",
      why_overlooked:
        "Many providers are less familiar with adenomyosis than other conditions. Ask about it specifically.",
    });
  }

  if (count("acne") >= 3 && count("mood_swings") >= 3 && count("bloating") >= 2) {
    flags.push({
      id: "pcos",
      name: "PCOS Indicators",
      icon: "🔵",
      severity: "discuss",
      summary: "Acne, mood swings, and bloating are common PCOS symptoms that often go unconnected.",
      detail:
        "Polycystic Ovary Syndrome (PCOS) affects up to 1 in 5 women and causes a wide mix of symptoms: acne, mood changes, bloating, and irregular cycles. A hormonal blood panel and pelvic ultrasound can confirm it.",
      why_overlooked:
        "Symptoms span skin, mood, and cycle — providers rarely connect them without a comprehensive look.",
    });
  }

  return flags;
}
