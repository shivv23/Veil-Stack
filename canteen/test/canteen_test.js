import { BN } from 'web3-utils';
const Canteen = artifacts.require("Canteen");

contract('Canteen', accounts => {
  let canteen = null;
  const owner = accounts[0];
  const purchaser = accounts[1];
  let chai, should;

  // Dynamically import and configure Chai
  before(async () => {
    chai = await import('chai');
    const chaiAsPromised = await import('chai-as-promised');
    chai.use(chaiAsPromised.default);
    should = chai.should();
  });

  beforeEach(async function() {
    canteen = await Canteen.new({ from: owner, gas: 3000000 });
  });

  it('initial state', async function() {
    const members = await canteen.getMembersCount();
    const images = await canteen.getImagesCount();

    new BN(members).eq(new BN(0)).should.be.true;
    new BN(images).eq(new BN(0)).should.be.true;
  });

  describe('Hosts and Images:', () => {
    var details;

    it('test suite 1', async function() {
      await canteen.addMember("host1");
      details = await canteen.getMemberDetails("host1");
      details[0].should.be.equal("");
      details[1].should.be.equal(true);

      await canteen.addImage("img1", 2);
      details = await canteen.getMemberDetails("host1");
      details[0].should.be.equal("img1");

      await canteen.addMember("host2");
      details = await canteen.getMemberDetails("host2");
      details[0].should.be.equal("img1");
      details[1].should.be.equal(true);

      await canteen.addMember("host3");
      details = await canteen.getMemberDetails("host3");
      details[0].should.be.equal("");
      details[1].should.be.equal(true);

      await canteen.removeMember("host2");
      details = await canteen.getMemberDetails("host2");
      details[0].should.be.equal("");
      details[1].should.be.equal(false);
      details = await canteen.getMemberDetails("host3");
      details[0].should.be.equal("img1");

      await canteen.addImage("img2", 2);
      const images = await canteen.getImagesCount();
      new BN(images).eq(new BN(2)).should.be.true;
      details = await canteen.getMemberDetails("host1");
      details[0].should.be.equal("img2");
      details = await canteen.getMemberDetails("host3");
      details[0].should.be.equal("img1");

      await canteen.removeImage("img1");
      details = await canteen.getMemberDetails("host1");
      details[0].should.be.equal("img2");
      details = await canteen.getMemberDetails("host3");
      details[0].should.be.equal("img2");
    });
  });

  describe('Adding Ports and Image Details:', () => {
    var details;

    it('test suite 1', async function() {
      await canteen.addImage("image1", 2);
      details = await canteen.getImageDetails("image1");
      new BN(details[0]).eq(new BN(2)).should.be.true;
      new BN(details[1]).eq(new BN(0)).should.be.true;
      details[2].should.be.equal(true);

      await canteen.addPortForImage("image1", 8080, 80);
      details = await canteen.getPortsForImage("image1");
      new BN(details[0][0]).eq(new BN(8080)).should.be.true;
      new BN(details[0][1]).eq(new BN(80)).should.be.true;

      await canteen.addPortForImage("image1", 5000, 50);
      details = await canteen.getPortsForImage("image1");
      new BN(details[1][0]).eq(new BN(5000)).should.be.true;
      new BN(details[1][1]).eq(new BN(50)).should.be.true;
    });
  });
});
