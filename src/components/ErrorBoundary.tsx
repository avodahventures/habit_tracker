import React from 'react';
import { View, Text, StyleSheet, ScrollView, Button } from 'react-native';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('====== ERROR BOUNDARY CAUGHT ERROR ======');
    console.error('Error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Component stack:', errorInfo.componentStack);
    console.error('========================================');
    
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>⚠️ App Error</Text>
          <Text style={styles.subtitle}>
            {this.state.error?.message || 'Unknown error'}
          </Text>
          
          <ScrollView style={styles.stackContainer}>
            <Text style={styles.sectionTitle}>Error Stack:</Text>
            <Text style={styles.stack}>
              {this.state.error?.stack || 'No stack trace'}
            </Text>
            
            {this.state.errorInfo && (
              <>
                <Text style={styles.sectionTitle}>Component Stack:</Text>
                <Text style={styles.stack}>
                  {this.state.errorInfo.componentStack}
                </Text>
              </>
            )}
          </ScrollView>

          <View style={styles.buttonContainer}>
            <Button title="Reload App" onPress={this.handleReset} />
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEE2E2',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#991B1B',
    marginTop: 40,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#7F1D1D',
    marginBottom: 16,
  },
  stackContainer: {
    flex: 1,
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#991B1B',
    marginTop: 12,
    marginBottom: 8,
  },
  stack: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#991B1B',
  },
  buttonContainer: {
    marginTop: 16,
  },
});