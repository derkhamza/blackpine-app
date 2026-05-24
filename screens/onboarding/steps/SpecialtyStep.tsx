import { OnboardingShell } from "../OnboardingShell";
import { Choice } from "../Choice";
import { useT } from "../../../lib/useT";

const SPECIALTY_IDS = [
  "medecin_generaliste",
  "medecin_specialiste",
  "dentiste",
  "kinesitherapeute",
  "sage_femme",
  "autre",
];

const ICONS = ["🩺", "🏥", "🦷", "💪", "👶", "⚕️"];

export function SpecialtyStep({
  value,
  onChange,
  onNext,
  onBack,
}: {
  value: string | null;
  onChange: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const { t } = useT();

  const handleSelect = (id: string) => {
    onChange(id);
    // Brief selection feedback, then auto-advance
    setTimeout(onNext, 350);
  };

  return (
    <OnboardingShell
      stepIndex={2}
      totalSteps={6}
      title={t("onboarding.specialtyTitle")}
      subtitle={t("onboarding.specialtySub")}
      onBack={onBack}
    >
      {SPECIALTY_IDS.map((id, i) => (
        <Choice
          key={id}
          label={t(`onboarding.specialties.${id}`)}
          icon={ICONS[i]}
          selected={value === id}
          onPress={() => handleSelect(id)}
        />
      ))}
    </OnboardingShell>
  );
}
