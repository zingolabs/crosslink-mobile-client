export default {
  setString: (s: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(s).catch(() => {});
    }
  },
  getString: async () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
      return navigator.clipboard.readText().catch(() => '');
    }
    return '';
  },
  hasString: async () => false,
};
