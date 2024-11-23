import type {TestDependencies} from '../../../create-dependency-container.test.js';

export default class Module1Service {
  private _id: string;
  constructor(
    scopedCounter: TestDependencies['scopedCounter'],
    private disposeSpy: TestDependencies['disposeSpy'],
  ) {
    this._id = `module1Service - ${scopedCounter()}`;
  }

  getId() {
    return this._id;
  }

  dispose() {
    this.disposeSpy(this._id);
  }
}
