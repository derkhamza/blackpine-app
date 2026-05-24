import { useState } from "react";
import { CommuneType, DoctorProfile, MaritalStatus, PracticeType } from "blackpine-engine";
import { useApp } from "../../lib/AppContext";
import { getStoredUser } from "../../lib/api";
import { saveDoctorProfile } from "../../lib/cabinetStorage";
import { WelcomeStep } from "./steps/WelcomeStep";
import { DoctorInfoStep, DoctorInfoData } from "./steps/DoctorInfoStep";
import { SpecialtyStep } from "./steps/SpecialtyStep";
import { PracticeLocationStep } from "./steps/PracticeLocationStep";
import { ActivityFamilyStep } from "./steps/ActivityFamilyStep";
import { FinishStep } from "./steps/FinishStep";

type Step = 0 | 1 | 2 | 3 | 4 | 5;

// Maps fiscal specialty ID → display label for ordonnances/certificates
const SPECIALTY_LABELS: Record<string, string> = {
  medecin_generaliste: "Médecin Généraliste",
  medecin_specialiste: "Médecin Spécialiste",
  dentiste: "Docteur en Chirurgie Dentaire",
  kinesitherapeute: "Kinésithérapeute",
  sage_femme: "Sage-Femme",
  autre: "Professionnel de Santé",
};

interface Builder {
  specialty: string | null;
  practiceType: PracticeType | "SALARIED" | null;
  commune: string;
  communeType: CommuneType | null;
  address: string;
  activityStartDate: string | null;
  marital: MaritalStatus | null;
  dependents: number;
}

const DEFAULT_DOCTOR_INFO: DoctorInfoData = { firstName: "", lastName: "", phone: "" };

export function OnboardingFlow() {
  const { onOnboardingComplete } = useApp();
  const [step, setStep] = useState<Step>(0);
  const [builder, setBuilder] = useState<Builder>({
    specialty: null, practiceType: null, commune: "",
    communeType: null, address: "",
    activityStartDate: null, marital: null, dependents: 0,
  });
  const [doctorInfo, setDoctorInfo] = useState<DoctorInfoData>(DEFAULT_DOCTOR_INFO);

  const update = (patch: Partial<Builder>) => setBuilder((p) => ({ ...p, ...patch }));
  const next = () => setStep((s) => Math.min(s + 1, 5) as Step);
  const back = () => setStep((s) => Math.max(s - 1, 0) as Step);

  const finish = async (withDemo: boolean) => {
    // Save cabinet doctor profile before screen transitions so CabinetContext
    // finds it on first load. Auto-populate specialty display label.
    const user = await getStoredUser();
    const uid = user?.id ?? "local";
    const fullName = `${doctorInfo.firstName.trim()} ${doctorInfo.lastName.trim().toUpperCase()}`.trim();
    await saveDoctorProfile(
      {
        fullName,
        specialtyLabel: builder.specialty ? SPECIALTY_LABELS[builder.specialty] : undefined,
        address: builder.address.trim() || undefined,
        phone: doctorInfo.phone.trim() || undefined,
      },
      uid
    );

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
    case 1: return (
      <DoctorInfoStep data={doctorInfo} onChange={(p) => setDoctorInfo((d) => ({ ...d, ...p }))} onNext={next} onBack={back} />
    );
    case 2: return (
      <SpecialtyStep value={builder.specialty} onChange={(v) => update({ specialty: v })} onNext={next} onBack={back} />
    );
    case 3: return (
      <PracticeLocationStep
        practiceType={builder.practiceType}
        commune={builder.commune}
        communeType={builder.communeType}
        address={builder.address}
        onChangePractice={(v) => update({ practiceType: v })}
        onChangeCommune={(v) => update({ commune: v })}
        onChangeZone={(v) => update({ communeType: v })}
        onChangeAddress={(v) => update({ address: v })}
        onNext={next}
        onBack={back}
      />
    );
    case 4: return (
      <ActivityFamilyStep
        activityDate={builder.activityStartDate}
        marital={builder.marital}
        dependents={builder.dependents}
        onChangeDate={(v) => update({ activityStartDate: v })}
        onChangeMarital={(v) => update({ marital: v })}
        onChangeDependents={(v) => update({ dependents: v })}
        onNext={next}
        onBack={back}
      />
    );
    case 5: return <FinishStep onChoose={(withDemo) => finish(withDemo)} onBack={back} />;
  }
}
