import type {TestDependencies} from '../../../create-dependency-container.test.js';

export default class Module1Repository {
  private _id: string;
  constructor(
    scopedCounter: TestDependencies['scopedCounter'],
    private disposeSpy: TestDependencies['disposeSpy'],
  ) {
    this._id = `module1Repository - ${scopedCounter()}`;
  }

  getId() {
    return this._id;
  }

  async dispose() {
    await new Promise<void>(res => {
      setImmediate(() => {
        this.disposeSpy(this._id);
        res();
      });
    });
  }
}
