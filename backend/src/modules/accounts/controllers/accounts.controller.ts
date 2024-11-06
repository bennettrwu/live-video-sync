declare global {
  interface Dependencies {
    accountsController: ReturnType<typeof accountController>;
  }
}

export default function accountController({logger}: Dependencies) {
  return {
    test() {
      logger.info('test');
      return 'test';
    },
  };
}
