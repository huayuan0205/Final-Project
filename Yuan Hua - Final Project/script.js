//Prep work 
const W = d3.select('.plot').node().clientWidth;
const H = d3.select('.plot').node().clientHeight;
const margin = {t:100, r:50, b:50, l:50};
const w = W - margin.l - margin.r;
const h = H - margin.t - margin.b;
console.group('Width and Height of each graph')
console.log(W);
console.log(H);
console.groupEnd();


//Add DOM node - 'svg'& 'g' for each graph
const plot1 = d3.select('#plot-1')
	.append('svg')
		.attr('width', W)
		.attr('height', H)
	.append('g')
		.attr('class','plot')
		.attr('transform', `translate(${margin.l}, ${margin.t})`);

const plot2 = d3.select('#plot-2')
	.append('svg')
		.attr('width', W)
		.attr('height', H)
	.append('g')
		.attr('class','plot')
		.attr('transform', `translate(${margin.l}, ${margin.t})`);


//Global Variables
const YEAR = 2017;
const INDICATOR_GDP_PER_CAPITA = 'GDP per capita (constant 2010 US$)';
const INDICATOR_SIZE = 'Population, total';


//Add DOM node - 'g' for both axis
const axisXNode = plot2.append('g')
					   .attr('class','axis-x')
					   .attr('transform',`translate(0,${h})`);
const axisYNode = plot2.append('g').attr('class','axis-y');


//Choropleth
let metadataMap;
const projection = d3.geoMercator();
	//.scale(1)
	//.translate([0, 0]);
const path = d3.geoPath().projection(projection);

const format = d3.format(',.2r');


//Load Data
const dataPromise = d3.csv('./data/data.csv', parseData)
.then(function(rows){ 
	return rows.reduce(function(acc,val){return acc.concat(val)}, []); 
});
const metadataPromise = d3.csv('./data/countries-metadata.csv', parseMetadata);
const geojsonPromise = d3.json('./data/countries.geojson');

Promise.all([dataPromise, metadataPromise, geojsonPromise])
	.then(function([data, metadata, geojson]){

	//Filter the data for the indicator
	const indicators = data.filter(function(d){
			return d.series === INDICATOR_GDP_PER_CAPITA || d.series === INDICATOR_SIZE;
		});

	//Provide each country with its corresponding region of the world
	const metadataMap = d3.map(metadata, function(d){ return d.Code });
	indicators.forEach(function(d){
		const region = metadataMap.get(d.countryCode).Region;
		d.region = region;
	});
	console.group('indicators');
	console.log(indicators);
	console.groupEnd();

	//Further Filter 
	const indicatorsBy1990 = indicators.filter(function(d){
	return d.year === 1990;
	})
	const indicatorsBy2000 = indicators.filter(function(d){
	return d.year === 2000;
	})
	const indicatorsBy2010 = indicators.filter(function(d){
	return d.year === 2010;
	})
	const indicatorsBy2017 = indicators.filter(function(d){
	return d.year === 2017;
	})

	//Nest the filtered GDP data by country
	const indicatorsByCountryBy1990 = d3.nest()
			.key(function(d){return d.country})
			.entries(indicatorsBy1990);
	const indicatorsByCountryBy2000 = d3.nest()
			.key(function(d){return d.country})
			.entries(indicatorsBy2000);
	const indicatorsByCountryBy2010 = d3.nest()
			.key(function(d){return d.country})
			.entries(indicatorsBy2010);
	const indicatorsByCountryBy2017 = d3.nest()
			.key(function(d){return d.country})
			.entries(indicatorsBy2017);

	console.group('indicatorsByCountryBy2017')
	console.log(indicatorsByCountryBy2017);
	console.groupEnd();

	//Roll up the indicator with GeoJSON data
	const GDPPerCapitaMap = d3.map(indicators, function(d){return d.countryCode});
	geojson.features
		.forEach(function(feature){
			const GDPPerCapita = GDPPerCapitaMap.get(feature.properties.ISO_A3);
			feature.properties[INDICATOR_GDP_PER_CAPITA] = GDPPerCapita?GDPPerCapita.value:null;
		});

	//Configure geo functions with data
	path.projection(projection);

	drawChoropleth(geojson,plot1);
	drawScatter(indicatorsByCountryBy1990,plot2);

	//Buttons
	d3.select('#GDP1990').on('click', function(d){
	    drawScatter(indicatorsByCountryBy1990,plot2);
	    console.log('1990');
		d3.event.preventDefault();
	});

	d3.select('#GDP2000').on('click', function(d){
	    drawScatter(indicatorsByCountryBy2000,plot2);
	    console.log('2000');
		d3.event.preventDefault();
	});

	d3.select('#GDP2010').on('click', function(d){
	    drawScatter(indicatorsByCountryBy2010,plot2);
	    console.log('2010');
	    console.log(d3.event);
	    d3.event.preventDefault();
	    //d3.event.stopPropagation();
	    //return false;
	});

	d3.select('#GDP2017').on('click', function(d){
	    drawScatter(indicatorsByCountryBy2017,plot2);
	    console.log('2017');
	    d3.event.preventDefault();
	});
	
});


function drawChoropleth(geojson,selection){

	//set colors
	const maxGDPPerCapita = d3.max(geojson.features, function(d){
		return d.properties[INDICATOR_GDP_PER_CAPITA];
	});
	console.log(maxGDPPerCapita);
	const scaleColor = d3.scaleLinear().domain([0, maxGDPPerCapita]).range(['#dfefff','#1576f5']);

	//Update & Enter & Exit
	//Update
	const nodes = selection.selectAll('.country')
		.data(geojson.features, function(d){return d.properties.ISO_A3});

	//tooltip
    const tooltip = d3.select('.custom-tooltip')
    	.append('div')
        .style('opacity', 0);

	//Enter
	const nodesEnter = nodes.enter()
		.append('path')
		.attr('class','country');

    nodes.merge(nodesEnter)
   		//color variation among different countries
		.attr('d', path)
		.style('fill', function(d){
			return scaleColor(d.properties[INDICATOR_GDP_PER_CAPITA]);
		})
		.style('opacity',0.6)

		//hover over
		.on('mouseenter',function(d,i){
			d3.select(this)//this stands for the DOM node
			  .style('opacity',0.8)
			  .style('stroke','#6e7cbd')
			  .style('stroke-width','1.2px');

			d3.select('.custom-tooltip')
			  .style('visibility','visible')
			  // .html(function(){
         		 //return '<strong>' + d.properties[INDICATOR_COUNTRY] + '</strong>'
        				 //+'<br>' + "<span style='color:black'>" + d.properties[INDICATOR_GDP_PER_CAPITA] + '<br>'
        		 //})
			
			//text shown in the tooltip
			d3.select('#value-country')
			  .text(d.properties.ADMIN);
			d3.select('#value-GDP')
			  .text(format(d.properties[INDICATOR_GDP_PER_CAPITA]));
		})

		.on('mousemove',function(){
			d3.select('.custom-tooltip')
				.style('top',(d3.event.pageY-190)+'px')
				.style('left',(d3.event.pageX-110)+'px');
		})

		.on('mouseleave',function(d,i){
			d3.select(this)
			  .style('opacity',0.5)
			  .style('stroke','#6e7cbd')
			  .style('stroke-width','0px');
			
			d3.select('.custom-tooltip')
			  .style('visibility','hidden');
		});

	//Exit
	nodes.exit().remove();
}

function drawScatter(data,selection){

	const countries = data.map(function(d){
		const datum = {};
		datum.country = d.key;
		datum.countryCode = d.values[0].countryCode;
		datum.year = d.values[0].year;
		datum.region = d.values[0].region;
		d.values.forEach(function(s){
			datum[s.series] = s.value;
		});
		return datum;
	});

	console.group('countries');
	console.log(countries);
	console.groupEnd();
	
	const regions = d3.nest()
			.key(function(d){ return d.values[0].region })
			.entries(data)
			.map(function(d){ return d.key });
	console.group('regions');
	console.log(regions);
	console.groupEnd();

	//Data discovery
	const YExtentMax = d3.max(countries, function(d){ return d[INDICATOR_GDP_PER_CAPITA]});
	const YExtent = d3.extent(countries, function(d){ return d[INDICATOR_GDP_PER_CAPITA]});
	console.log(YExtent);
	const sizeExtent = d3.extent(countries, function(d){ return d[INDICATOR_SIZE]});

	//set domain
	const scaleX = d3.scaleOrdinal()//x axis
		.domain(regions)
		.range(d3.range(regions.length).map(function(d,i){
				return i*(w-100)/(regions.length-1)+100;
		}));
	const scaleY = d3.scaleLog().domain(YExtent).range([h, 0]).clamp(true);//y axis
	const scaleSize = d3.scaleSqrt().domain(sizeExtent).range([2, 50]);
	const scaleColorScatter = d3.scaleOrdinal()
		.domain(regions)
		.range([
			'#BECBCF', //South Asia
			'#6E7D75',//Europe & Central Asia
			'#CE7870',//Middle East & North Africa
			'#ECBCB0',//East Ais & Pacific
			'#826A5F',//Sub-Sahara Africa
			'#EBA966',//Latin America & Caribbean
			'#c3c2c4'//North America
		]);

	//Update & Enter & Exit
	//Update
	const nodes = plot2.selectAll('.node')
		.data(countries, function(d){return d.countryCode});
	
	//Enter
	const nodesEnter = nodes.enter()
		.append('g')
		.attr('class', 'node')
		.attr('transform', function(d){ 
			const x = scaleX(d.region);
			return `translate(${x}, 0)`;
		});
		
	nodesEnter.append('circle');
	const text1 = nodesEnter.append('text').attr('class','text-1');
	const text2 = nodesEnter.append('text').attr('class','text-2');

	//Enter+Update
	nodes.merge(nodesEnter)
		.transition()
		.duration(1000)
		.attr('transform', function(d){ 
			const x = scaleX(d.region);
			const y = scaleY(d[INDICATOR_GDP_PER_CAPITA]);
			return `translate(${x}, ${y})`});

	nodes.merge(nodesEnter)
		.select('circle')
		.transition()
		.duration(1000)
		.attr('r', function(d){ return scaleSize(d[INDICATOR_SIZE]) })
		.attr('fill', function(d){ return scaleColorScatter(d.region) })
		.style('fill-opacity', 0.6)
		.style('stroke', '#b5b2b4')
		.style('stroke-width', '0.5px');

	nodes.merge(nodesEnter)
		.select('.text-1')
		.text(function(d){
			if(scaleSize(d[INDICATOR_SIZE]) > 16 ) return d.countryCode;
			return null;
		})
		.attr('text-anchor','Middle')
		.attr('transform',`translate(0,0)`)
		.style('fill', '#666')
		.style('font-size', '8px');

	nodes.merge(nodesEnter)
		.select('.text-2')
		.text(function(d){
			if(d[INDICATOR_GDP_PER_CAPITA] > YExtentMax*3/5) return d.countryCode;
			return null;
		})
		.attr('text-anchor','Middle')
		.attr('transform',`translate(0,0)`)
		.style('fill', 'red')
		.style('font-size', '8px');

	//Exit
	nodes.exit().remove();

	//Axes
	const axisX = d3.axisBottom()
		.scale(scaleX)
		.tickSize(-h);
	const axisY = d3.axisLeft()
		.scale(scaleY)
		.tickSize(-w);

	axisXNode
		.attr('transform',`translate(0, ${h})`)
		.transition()
		.call(axisX)
		.selectAll('line')
		.style('stroke-opacity', 0.1)
		.selectAll('text')
		.attr('transform',`translate(0,100)`);

	axisYNode
		.transition()
		.call(axisY)
		.selectAll('line')
		.style('stroke-opacity', 0.1);

}



//Parse data
function parseData(d){

	const country = d['Country Name'];
	const countryCode = d['Country Code'];
	const series = d['Series Name'];
	const seriesCode = d['Series Code'];

	delete d['Country Name'];
	delete d['Country Code'];
	delete d['Series Name'];
	delete d['Series Code'];

	const records = [];

	for(key in d){
		records.push({
			country:country,
			countryCode:countryCode,
			series:series,
			seriesCode:seriesCode,
			year:+key.split(' ')[0],
			value:d[key]==='..'?null:+d[key]
		})
	}

	return records;

}

function parseMetadata(d){

	return d;

}