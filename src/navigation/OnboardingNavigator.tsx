import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { QuestionOneScreen } from '../screens/onboarding/QuestionOneScreen';
import { QuestionTwoScreen } from '../screens/onboarding/QuestionTwoScreen';
import { QuestionThreeScreen } from '../screens/onboarding/QuestionThreeScreen';
import { PersonalizedResultScreen } from '../screens/onboarding/PersonalizedResultScreen';

interface OnboardingNavigatorProps {
  onComplete: () => void;
}

export function OnboardingNavigator({ onComplete }: OnboardingNavigatorProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({
    bibleReading: '',
    prayer: '',
    struggle: '',
  });

  const handleQuestionOne = (answer: string) => {
    setAnswers(prev => ({ ...prev, bibleReading: answer }));
    setCurrentStep(1);
  };

  const handleQuestionTwo = (answer: string) => {
    setAnswers(prev => ({ ...prev, prayer: answer }));
    setCurrentStep(2);
  };

  const handleQuestionThree = (answer: string) => {
    setAnswers(prev => ({ ...prev, struggle: answer }));
    setCurrentStep(3);
  };

  const renderScreen = () => {
    switch (currentStep) {
      case 0:
        return <QuestionOneScreen onNext={handleQuestionOne} />;
      case 1:
        return <QuestionTwoScreen onNext={handleQuestionTwo} />;
      case 2:
        return <QuestionThreeScreen onNext={handleQuestionThree} />;
      case 3:
        return <PersonalizedResultScreen answers={answers} onFinish={onComplete} />;
      default:
        return <QuestionOneScreen onNext={handleQuestionOne} />;
    }
  };

  return (
    <NavigationContainer>
      {renderScreen()}
    </NavigationContainer>
  );
}