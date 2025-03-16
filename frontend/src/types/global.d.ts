// Add these properties to the global Window interface
interface Window {
  emailCheckTimeout?: ReturnType<typeof setTimeout>;
  usernameCheckTimeout?: ReturnType<typeof setTimeout>;
}
