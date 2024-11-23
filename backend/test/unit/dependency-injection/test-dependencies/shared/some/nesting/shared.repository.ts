import type {TestDependencies} from '../../../../create-dependency-container.test.js';

export default class SharedRepository {
  private _id: string;
  constructor(
    scopedCounter: TestDependencies['scopedCounter'],
    private disposeSpy: TestDependencies['disposeSpy'],
  ) {
    this._id = `sharedRepository - ${scopedCounter()}`;
  }

  getId() {
    return this._id;
  }
}
