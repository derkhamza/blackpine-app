import { OnboardingShell } from "../OnboardingShell";
import { Choice } from "../Choice";
import { useT } from "../../../lib/useT";

interface Props {
  onChoose: (withDemo: boolean) => void;
  onBack: () => void;
}

export function FinishStep({ onChoose, onBack }: Props) {
  const { t } = useT();

  return (
    <OnboardingShell
      stepIndex={7}
      totalSteps={8}
      title={t("onboarding.finishTitle")}
      subtitle={t("onboarding.finishSub")}
      onBack={onBack}
    >
      <Choice
        label={t("onboarding.startFresh")}
        description={t("onboarding.startFreshDesc")}
        icon="🚀"
        selected={false}
        onPress={() => onChoose(false)}
      />
      <Choice
        label={t("onboarding.startDemo")}
        description={t("onboarding.startDemoDesc")}
        icon="🎯"
        selected={false}
        onPress={() => onChoose(true)}
      />
    </OnboardingShell>
  );
}