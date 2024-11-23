import type {TestDependencies} from '../../../../../create-dependency-container.test.js';

export default class Module2Repository {
  private _id: string;
  constructor(
    scopedCounter: TestDependencies['scopedCounter'],
    private disposeSpy: TestDependencies['disposeSpy'],
    private module1Service: TestDependencies['module1Service'],
    private module1Repository: TestDependencies['module1Repository'],
  ) {
    this._id = `module2Repository - ${scopedCounter()}`;
  }

  getId() {
    return this._id;
  }

  getModule1ServiceId() {
    return this.module1Service.getId();
  }

  getModule1RepositoryId() {
    return this.module1Repository.getId();
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
