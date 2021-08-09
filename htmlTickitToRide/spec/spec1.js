var testingFillColor = require('../newUno.js');
describe('makeCard'()=>{
	it('fillColor'()=>{
		exspect(testingFillColor.card({
			fillColor:'Blue',
			number:8,
			repeat:1
		}).toBe({'undefined'}))
	}
});