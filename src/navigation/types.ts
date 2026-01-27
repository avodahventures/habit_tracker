export type RootTabParamList = {
  Dashboard: undefined;
  Analytics: undefined;  // Changed from Habits
  Prayer: undefined;
  Journal: undefined;
  Settings: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootTabParamList {}
  }
}