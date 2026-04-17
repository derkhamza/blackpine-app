import { OnboardingShell } from "../OnboardingShell";
import { Choice } from "../Choice";

interface Props {
  onChoose: (withDemo: boolean) => void;
  onBack: () => void;
}

export function FinishStep({ onChoose, onBack }: Props) {
  return (
    <OnboardingShell
      stepIndex={7}
      totalSteps={8}
      title="Comment souhaitez-vous commencer ?"
      subtitle="Vous pouvez toujours changer d'avis plus tard dans le Profil."
      onBack={onBack}
    >
      <Choice
        label="Commencer avec mes vraies données"
        description="L'app démarre vide. Ajoutez vos recettes et charges au fur et à mesure."
        icon="🚀"
        selected={false}
        onPress={() => onChoose(false)}
      />
      <Choice
        label="Explorer avec des données de démonstration"
        description="Voyez comment l'app fonctionne avec un exemple de cabinet avant de saisir vos vraies données."
        icon="🎯"
        selected={false}
        onPress={() => onChoose(true)}
      />
    </OnboardingShell>
  );
}