mapboxgl.accessToken = 'pk.eyJ1IjoiY2FwdGNwdCIsImEiOiJjbHZ1NzU1NXMxZW55MmtwNnIyNGF4ZWplIn0.xUm1dJsTE1JMENPgA0GaKA';
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v9',
    projection: 'globe',
    zoom: 1,
    center: [30, 15]
});

map.addControl(new mapboxgl.NavigationControl());
map.scrollZoom.disable();

let countryData;
let colorScale;
let selectedYear;
let selectedTechnology;
let clickedCountry = null;

map.on('style.load', () => {
    map.setFog({});

    map.addSource('countries', {
        type: 'vector',
        url: 'mapbox://mapbox.country-boundaries-v1'
    });

    map.addLayer({
        'id': 'country-boundaries',
        'type': 'fill',
        'source': 'countries',
        'source-layer': 'country_boundaries',
        'paint': {
            'fill-color': ['get', 'color'],
            'fill-opacity': 0.7
        }
    });

    d3.csv('ELECSTAT.csv').then(function (data) {
        countryData = d3.group(data, d => d["Country/area"]);
        const years = [...new Set(data.map(d => d["Year"]))].sort();
        const technologies = [...new Set(data.map(d => d["Technology"]))].sort();

        const yearSelector = d3.select('#year');
        yearSelector.selectAll('option')
            .data(years)
            .enter()
            .append('option')
            .attr('value', d => d)
            .text(d => d);

        const technologySelector = d3.select('#technology');
        technologySelector.selectAll('option')
            .data(technologies)
            .enter()
            .append('option')
            .attr('value', d => d)
            .text(d => d);

        selectedYear = years[0];
        selectedTechnology = technologies[0];
        updateMapData(selectedYear, selectedTechnology);

        yearSelector.on('change', function () {
            selectedYear = this.value;
            updateMapData(selectedYear, selectedTechnology);
        });

        technologySelector.on('change', function () {
            selectedTechnology = this.value;
            updateMapData(selectedYear, selectedTechnology);
        });
    });
});

function updateMapData(year, technology) {
    if (!countryData) return;

    const yearData = new Map();
    let maxValue = 0;

    countryData.forEach((values, country) => {
        const dataForYear = values.find(d => d["Year"] === year && d["Technology"] === technology);
        if (dataForYear) {
            const value = +dataForYear["Electricity statistics"];
            yearData.set(country, value);
            if (value > maxValue) maxValue = value;
        }
    });

    colorScale = d3.scaleSequential(d3.interpolateOranges)
        .domain([0, maxValue]);

    map.setPaintProperty('country-boundaries', 'fill-color', [
        'case',
        ...[].concat(...Array.from(yearData, ([country, value]) => [
            ['==', ['get', 'name_en'], country],
            value ? colorScale(value) : 'darkgray'
        ])),
        'darkgray'
    ]);

    updateLegend(maxValue);
}

function updateLegend(maxValue) {
    const legend = d3.select('#legend');
    legend.select('#max-value').text(maxValue);
}

const popup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false
});

map.on('mousemove', 'country-boundaries', (e) => {
    map.getCanvas().style.cursor = 'pointer';

    const countryName = e.features[0].properties.name_en;
    const countryStats = countryData.get(countryName);

    if (!clickedCountry || countryName === clickedCountry) {
        updateLinePlotData(countryName);
        updateBarPlotData(countryName);
        drawPieCharts(countryName);
    }

    if (countryStats) {
        const dataForYear = countryStats.find(d => d["Year"] === selectedYear && d["Technology"] === selectedTechnology);
        if (dataForYear) {
            const statsText = `Year: ${dataForYear["Year"]}, Electricity Generation: ${dataForYear["Electricity statistics"]} GWh`;
            popup
                .setLngLat(e.lngLat)
                .setText(`Country: ${countryName}\n${statsText}`)
                .addTo(map);
        }
    }
});

map.on('mouseleave', 'country-boundaries', () => {
    map.getCanvas().style.cursor = '';
    popup.remove();
});

map.on('click', 'country-boundaries', (e) => {
    const countryName = e.features[0].properties.name_en;
    clickedCountry = countryName;

    const countryStats = countryData.get(countryName);

    updateLinePlotData(countryName);
    updateBarPlotData(countryName);
    drawPieCharts(countryName);

    if (countryStats) {
        const dataForYear = countryStats.find(d => d["Year"] === selectedYear && d["Technology"] === selectedTechnology);
        if (dataForYear) {
            const statsText = `Year: ${dataForYear["Year"]}, Electricity Generation: ${dataForYear["Electricity statistics"]} GWh`;
            new mapboxgl.Popup()
                .setLngLat(e.lngLat)
                .setText(`Country: ${countryName}\n${statsText}`)
                .addTo(map);
        }
    }
});

const secondsPerRevolution = 240;
const maxSpinZoom = 5;
const slowSpinZoom = 3;

let userInteracting = false;
const spinEnabled = true;

function spinGlobe() {
    const zoom = map.getZoom();
    if (spinEnabled && !userInteracting && zoom < maxSpinZoom) {
        let distancePerSecond = 360 / secondsPerRevolution;
        if (zoom > slowSpinZoom) {
            const zoomDif = (maxSpinZoom - zoom) / (maxSpinZoom - slowSpinZoom);
            distancePerSecond *= zoomDif;
        }
        const center = map.getCenter();
        center.lng -= distancePerSecond;
        map.easeTo({ center, duration: 1000, easing: (n) => n });
    }
}

map.on('mousedown', () => {
    userInteracting = true;
});
map.on('dragstart', () => {
    userInteracting = true;
});

map.on('moveend', () => {
    spinGlobe();
});

spinGlobe();

let linePlotData = [];

function updateLinePlotData(countryName) {
    const countryStats = countryData.get(countryName);
    if (!countryStats) return;

    linePlotData = d3.rollup(
        countryStats,
        v => d3.sum(v, d => +d["Electricity statistics"]),
        d => d["Year"]
    );

    linePlotData = Array.from(linePlotData.entries()).map(([year, value]) => ({ year: +year, value }));

    redrawLinePlot(countryName);
}

function redrawLinePlot(countryName) {
    const svg = d3.select('#lineplot');
    svg.selectAll('*').remove();

    const width = +svg.node().getBoundingClientRect().width;
    const height = 300;

    const margin = { top: 20, right: 20, bottom: 40, left: 80 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    document.getElementById('linePlotTitle').textContent = `${countryName} - Total Electricty Generation`;

    const x = d3.scaleLinear().range([0, innerWidth]);
    const y = d3.scaleLinear().range([innerHeight, 0]);

    const xAxis = d3.axisBottom(x);
    const yAxis = d3.axisLeft(y);

    const line = d3.line()
        .x(d => x(d.year))
        .y(d => y(d.value));

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    x.domain(d3.extent(linePlotData, d => d.year));
    y.domain([0, d3.max(linePlotData, d => d.value)]);

    g.append("g")
        .attr("transform", `translate(0, ${innerHeight})`)
        .call(xAxis);

    g.append("g")
        .call(yAxis)
        .append("text")
        .attr("fill", "#000")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 10)
        .attr("dy", "0.71em")
        .attr("text-anchor", "end")
        .text("Electricity Generation (GWh)");

    g.append("path")
        .datum(linePlotData)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("stroke-width", 2)
        .attr("d", line);

    const dots = g.selectAll(".dot")
        .data(linePlotData)
        .enter().append("circle")
        .attr("class", "dot")
        .attr("cx", d => x(d.year))
        .attr("cy", d => y(d.value))
        .attr("r", 4)
        .attr("fill", "steelblue");

    const tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    dots.on("mouseover", function (event, d) {
        d3.select(this)
            .transition()
            .duration(200)
            .attr("r", 6)
            .attr("fill", "orange");

        const value = d3.format(",")(d.value);
        tooltip.transition()
            .duration(200)
            .style("opacity", 0.9);
        tooltip.html(`Year: ${d.year}, Value: ${value} GWh`)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
    })
        .on("mouseout", function (d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr("r", 4)
                .attr("fill", "steelblue");

            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        })
        .on("click", function (event, d) {
            alert(`Year: ${d.year}, Value: ${d.value} GWh`);
        });
}


function updateBarPlotData(countryName) {
    const countryStats = countryData.get(countryName);
    if (!countryStats) return;

    const barPlotData = d3.rollup(
        countryStats,
        v => d3.sum(v, d => +d["Electricity statistics"]),
        d => d["Technology"]
    );

    redrawBarPlot(barPlotData, countryName);
    
}

function redrawBarPlot(barPlotData, countryName) {
    const svg = d3.select('#barplot');
    svg.selectAll('*').remove();

    const width = +svg.node().getBoundingClientRect().width;
    const height = 300;

    const margin = { top: 20, right: 20, bottom: 100, left: 80 }; 
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    document.getElementById('barPlotTitle').textContent = `${countryName} - Total Electricity Generation by Technology`;

    const x = d3.scaleBand().range([0, innerWidth]).padding(0.1);
    const y = d3.scaleLinear().range([innerHeight, 0]);

    const xAxis = d3.axisBottom(x);
    const yAxis = d3.axisLeft(y);

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const data = Array.from(barPlotData.entries()).sort((a, b) => b[1] - a[1]);

    x.domain(data.map(d => d[0]));
    y.domain([0, d3.max(data, d => d[1])]);

    g.append("g")
        .attr("transform", `translate(0, ${innerHeight})`)
        .call(xAxis)
        .selectAll("text")
        .attr("y", 0)
        .attr("x", 9)
        .attr("dy", ".35em")
        .attr("transform", "rotate(90)")
        .style("text-anchor", "start");

    g.append("g")
        .call(yAxis)
        .append("text")
        .attr("fill", "#000")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 10)
        .attr("dy", "0.71em")
        .attr("text-anchor", "end")
        .text("Total Electricity Generation (GWh)");

    const tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    g.selectAll(".bar")
        .data(data)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d[0]))
        .attr("width", x.bandwidth())
        .attr("y", d => y(d[1]))
        .attr("height", d => innerHeight - y(d[1]))
        .attr("fill", "steelblue")
        .on("mouseover", function (event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr("fill", "orange");

            const value = d3.format(",")(d[1]);
            tooltip.transition()
                .duration(200)
                .style("opacity", 0.9);
            tooltip.html(`${d[0]}: ${value} GWh`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function (d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr("fill", "steelblue");

            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });
}

const renewableTechs = ["Solar photovoltaic", "Solar thermal energy", "Onshore wind energy", "Offshore wind energy", "Renewable hydropower", "Mixed Hydro Plants", "Marine energy", "Solid biofuels", "Renewable municipal waste", "Liquid biofuels", "Biogas", "Geothermal energy"];
const nonRenewableTechs = ["Pumped storage", "Coal and peat", "Oil", "Natural gas", "Fossil fuels n.e.s.", "Nuclear"];

let renewableData, nonRenewableData;

function drawPieCharts(countryName) {
    const countryStats = countryData.get(countryName);
    if (!countryStats) return;

    renewableData = countryStats.filter(d => renewableTechs.includes(d["Technology"]));
    nonRenewableData = countryStats.filter(d => nonRenewableTechs.includes(d["Technology"]));

    const pieChartType = document.getElementById('pieChartType').value;
    drawPieChart(pieChartType, countryName);
}

function drawPieChart(type, countryName) {
    const pieChartSvg = d3.select('#pieChart');
    const legendSvg = d3.select('#pieChartLegend');
    pieChartSvg.selectAll('*').remove();
    legendSvg.selectAll('*').remove();

    const pieChartWidth = +pieChartSvg.node().getBoundingClientRect().width;
    const pieChartHeight = +pieChartSvg.node().getBoundingClientRect().height;
    const legendWidth = +legendSvg.node().getBoundingClientRect().width;
    const legendHeight = +legendSvg.node().getBoundingClientRect().height;

    const radius = Math.min(pieChartWidth, pieChartHeight) / 2 * 0.8;
    const innerRadius = radius * 0.4;

    const data = type === 'renewable' ? renewableData : nonRenewableData;
    const title = type === 'renewable' ? 'Renewable Energy Sources' : 'Non-Renewable Energy Sources';

    const groupedData = d3.rollup(
        data,
        v => d3.sum(v, d => +d["Electricity statistics"]),
        d => d["Technology"]
    );

    const technologies = Array.from(groupedData.keys());
    const values = Array.from(groupedData.values());
    const total = d3.sum(values);

    const pie = d3.pie()
        .sort(null)
        .value(d => d);

    const arcGenerator = d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(radius);

        const pieChart = pieChartSvg.append('g')
        .attr('transform', `translate(${pieChartWidth / 2}, ${pieChartHeight / 2})`);
    
    pieChart.selectAll('.arc')
        .data(pie(values.filter(value => value > 0)))
        .enter()
        .append('g')
        .attr('class', 'arc')
        .append('path')
        .attr('d', arcGenerator)
        .style('fill', (d, i) => d3.schemeSet3[i % 12])
        .style('stroke', 'white')
        .style('stroke-width', '2px')
        .on('mouseover', function (event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('d', d3.arc()
                    .innerRadius(innerRadius)
                    .outerRadius(radius * 1.05)
                );
    
            const technology = technologies[d.index];
            const value = d.value.toLocaleString();
            const percentage = Math.round(d.value / total * 100);
    
            const textGroup = pieChart.append('g')
                .attr('class', 'text-group');
    
            textGroup.append('text')
                .attr('class', 'text-technology')
                .attr('text-anchor', 'middle')
                .style('font-weight', 'bold')
                .style('font-size', '16px')
                .text(technology);
    
            textGroup.append('text')
                .attr('class', 'text-value')
                .attr('text-anchor', 'middle')
                .attr('y', 20)
                .style('font-size', '14px')
                .text(`${value} GWh (${percentage}%)`);
        })
        .on('mouseout', function (d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('d', arcGenerator);
    
            pieChart.selectAll('.text-group').remove();
        });

    const legendGroup = legendSvg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(10, 20)`);

    const legendItems = pie(values.filter(value => value > 0));
    const numColumns = 1;
    const numRows = Math.ceil(legendItems.length / numColumns);

    const legend = legendGroup.selectAll('.legend-item')
        .data(legendItems)
        .enter()
        .append('g')
        .attr('class', 'legend-item')
        .attr('transform', (d, i) => {
            const column = i % numColumns;
            const row = Math.floor(i / numColumns);
            return `translate(0, ${row * 20})`;
        });

    legend.append('rect')
        .attr('width', 18)
        .attr('height', 18)
        .style('fill', (d, i) => d3.schemeSet3[i % 12]);

    legend.append('text')
        .attr('x', 24)
        .attr('y', 9)
        .attr('dy', '.35em')
        .text(d => technologies[d.index]);
}

document.getElementById('pieChartType').addEventListener('change', function () {
    const countryName = clickedCountry;
    if (countryName) {
        drawPieChart(this.value, countryName);
    }
});
