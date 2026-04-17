import { useState } from "react";
import { OnboardingShell } from "../OnboardingShell";
import { Choice } from "../Choice";

const OPTIONS = [
  { id: "medecin_generaliste", label: "Médecin généraliste", icon: "🩺" },
  { id: "medecin_specialiste", label: "Médecin spécialiste", icon: "🏥" },
  { id: "dentiste", label: "Dentiste", icon: "🦷" },
  { id: "kinesitherapeute", label: "Kinésithérapeute", icon: "💪" },
  { id: "sage_femme", label: "Sage-femme", icon: "👶" },
  { id: "autre", label: "Autre profession de santé", icon: "⚕️" },
];

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
  return (
    <OnboardingShell
      stepIndex={2}
      totalSteps={8}
      title="Quelle est votre spécialité ?"
      subtitle="Nous adaptons les catégories de recettes à votre pratique."
      onNext={onNext}
      onBack={onBack}
      nextDisabled={!value}
    >
      {OPTIONS.map((opt) => (
        <Choice
          key={opt.id}
          label={opt.label}
          icon={opt.icon}
          selected={value === opt.id}
          onPress={() => onChange(opt.id)}
        />
      ))}
    </OnboardingShell>
  );
}