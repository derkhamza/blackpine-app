import { useState } from "react";
import { CommuneType, DoctorProfile, MaritalStatus, PracticeType } from "blackpine-engine";
import { useApp } from "../../lib/AppContext";
import { WelcomeStep } from "./steps/WelcomeStep";
import { TrustStep } from "./steps/TrustStep";
import { SpecialtyStep } from "./steps/SpecialtyStep";
import { PracticeStep } from "./steps/PracticeStep";
import { LocationStep } from "./steps/LocationStep";
import { ActivityStep } from "./steps/ActivityStep";
import { FamilyStep } from "./steps/FamilyStep";
import { FinishStep } from "./steps/FinishStep";

type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface ProfileBuilder {
  specialty: string | null;
  practiceType: PracticeType | "SALARIED" | null;
  commune: string;
  communeType: CommuneType | null;
  activityStartDate: string | null;
  marital: MaritalStatus | null;
  dependents: number;
}

export function OnboardingFlow() {
  const { onOnboardingComplete } = useApp();
  const [step, setStep] = useState<Step>(0);
  const [builder, setBuilder] = useState<ProfileBuilder>({
    specialty: null, practiceType: null, commune: "",
    communeType: null, activityStartDate: null, marital: null, dependents: 0,
  });

  const update = (patch: Partial<ProfileBuilder>) => setBuilder((prev) => ({ ...prev, ...patch }));
  const next = () => setStep((s) => Math.min(s + 1, 7) as Step);
  const back = () => setStep((s) => Math.max(s - 1, 0) as Step);

  const finish = async (withDemo: boolean) => {
    const profile: DoctorProfile = {
      id: "user-" + Math.random().toString(36).slice(2, 9),
      legalForm: "PERSONNE_PHYSIQUE",
      practiceType: (builder.practiceType === "SALARIED" ? "CABINET_ONLY" : builder.practiceType) ?? "CABINET_ONLY",
      activityStartDate: builder.activityStartDate ?? new Date().toISOString().split("T")[0],
      commune: builder.commune || "Casablanca",
      communeType: builder.communeType ?? "URBAN",
      maritalStatus: builder.marital ?? "SINGLE",
      dependentsCount: builder.dependents,
      tpRegistered: builder.practiceType === "CABINET_ONLY" || builder.practiceType === "MIXED",
      specialty: builder.specialty ?? undefined,
    };
    await onOnboardingComplete(profile, withDemo);
  };

  switch (step) {
    case 0: return <WelcomeStep onNext={next} />;
    case 1: return <TrustStep onNext={next} onBack={back} />;
    case 2: return <SpecialtyStep value={builder.specialty} onChange={(v) => update({ specialty: v })} onNext={next} onBack={back} />;
    case 3: return <PracticeStep value={builder.practiceType} onChange={(v) => update({ practiceType: v })} onNext={next} onBack={back} />;
    case 4: return <LocationStep commune={builder.commune} communeType={builder.communeType} onChangeCommune={(v) => update({ commune: v })} onChangeType={(v) => update({ communeType: v })} onNext={next} onBack={back} />;
    case 5: return <ActivityStep value={builder.activityStartDate} onChange={(v) => update({ activityStartDate: v })} onNext={next} onBack={back} />;
    case 6: return <FamilyStep marital={builder.marital} dependents={builder.dependents} onChangeMarital={(v) => update({ marital: v })} onChangeDependents={(v) => update({ dependents: v })} onNext={next} onBack={back} />;
    case 7: return <FinishStep onChoose={finish} onBack={back} />;
  }
}