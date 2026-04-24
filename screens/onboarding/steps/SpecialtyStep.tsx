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

  return (
    <OnboardingShell
      stepIndex={3}
      totalSteps={9}
      title={t("onboarding.specialtyTitle")}
      subtitle={t("onboarding.specialtySub")}
      onNext={onNext}
      onBack={onBack}
      nextDisabled={!value}
    >
      {SPECIALTY_IDS.map((id, i) => (
        <Choice
          key={id}
          label={t(`onboarding.specialties.${id}`)}
          icon={ICONS[i]}
          selected={value === id}
          onPress={() => onChange(id)}
        />
      ))}
    </OnboardingShell>
  );
}