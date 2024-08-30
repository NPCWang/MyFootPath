// 定义不同的地图图层

var satelliteMap = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
});

var streetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
});

// 初始化地图并设置默认图层
var map = L.map('map', {
    center: [51.505, -0.09],  // 你可以根据需要设置初始视角
    zoom: 13,
    layers: [satelliteMap]  // 默认加载街道图层
});

// 添加图层控制器，允许用户切换图层
var baseLayers = {
    "Satellite": satelliteMap,
    "Street Map": streetMap
};

L.control.layers(baseLayers).addTo(map);

// 选择器和输入元素
var colorPicker = document.getElementById('colorPicker');
var lineWidth = document.getElementById('lineWidth');
var lineStyle = document.getElementById('lineStyle');
var trackSelect = document.getElementById('trackSelect');
var newTrackButton = document.getElementById('newTrackButton');

// 管理所有轨迹的对象
var tracks = {};
var currentTrack = null;

// 获取dashArray
function getDashArray(style) {
    switch (style) {
        case 'dashed':
            return '10, 10';
        case 'dotted':
            return '2, 10';
        default:
            return null; // 实线
    }
}

// 创建新轨迹的函数
function createNewTrack(name) {
    var newTrack = L.polyline([], {
        color: colorPicker.value,
        weight: parseInt(lineWidth.value),
        dashArray: getDashArray(lineStyle.value),
    }).addTo(map);
    
    tracks[name] = newTrack;
    currentTrack = newTrack;

    var option = document.createElement('option');
    option.value = name;
    option.text = name;
    trackSelect.add(option);
    trackSelect.value = name;
}

// 切换到选择的轨迹
function switchTrack(name) {
    currentTrack = tracks[name];
    if (currentTrack && currentTrack.getLatLngs().length > 0) {
        map.fitBounds(currentTrack.getBounds());
    } else {
        console.warn('Track is empty or not found:', name);
    }
}

// 初始化时加载轨迹数据
var savedTracks = JSON.parse(localStorage.getItem('travelTracks'));
if (savedTracks) {
    Object.keys(savedTracks).forEach(name => {
        createNewTrack(name);
        tracks[name].setLatLngs(savedTracks[name]);
    });
    trackSelect.value = Object.keys(savedTracks)[0];
    switchTrack(trackSelect.value);
}

// 保存所有轨迹到 localStorage 的函数
function saveTracks() {
    var trackData = {};
    for (var name in tracks) {
        trackData[name] = tracks[name].getLatLngs();
    }
    localStorage.setItem('travelTracks', JSON.stringify(trackData));
}

// 添加一个点击事件来记录轨迹但不保存
map.on('click', function(e) {
    if (currentTrack) {
        currentTrack.addLatLng(e.latlng);
    }
});

// 更新轨迹样式的函数
function updateTrackStyle() {
    if (currentTrack) {
        currentTrack.setStyle({
            color: colorPicker.value,
            weight: parseInt(lineWidth.value),
            dashArray: getDashArray(lineStyle.value),
        });
    }
}

// 当用户更改颜色、线宽或线条样式时更新轨迹样式
colorPicker.addEventListener('input', updateTrackStyle);
lineWidth.addEventListener('input', updateTrackStyle);
lineStyle.addEventListener('change', updateTrackStyle);

// 选择轨迹时切换
trackSelect.addEventListener('change', function() {
    switchTrack(this.value);
});

// 创建新轨迹按钮点击事件
newTrackButton.addEventListener('click', function() {
    var trackName = prompt("Enter a name for the new track:");
    if (trackName && !tracks[trackName]) {
        createNewTrack(trackName);
    } else if (tracks[trackName]) {
        alert("A track with this name already exists.");
    }
});

// 保存按钮点击事件
document.getElementById('saveButton').addEventListener('click', function() {
    saveTracks();
    alert('Tracks saved successfully!');
});

// 重置按钮点击事件
document.getElementById('resetButton').addEventListener('click', function() {
    if (currentTrack) {
        const trackName = trackSelect.value;

        // 清空当前轨迹
        currentTrack.setLatLngs([]);

        // 从地图上移除轨迹
        currentTrack.remove();

        // 从tracks对象中删除该轨迹
        delete tracks[trackName];

        // 从选择框中移除该轨迹选项
        trackSelect.remove(trackSelect.selectedIndex);

        // 如果没有其他轨迹，currentTrack设为null
        if (trackSelect.options.length === 0) {
            currentTrack = null;
        } else {
            // 切换到第一个轨迹作为当前轨迹
            trackSelect.selectedIndex = 0;
            currentTrack = tracks[trackSelect.value];
        }

        // 更新 LocalStorage 中的轨迹数据
        saveTracks();
    }
});


// 清除所有轨迹的按钮点击事件
document.getElementById('clearAllButton').addEventListener('click', function() {
    // 清空所有轨迹
    for (var name in tracks) {
        tracks[name].remove();  // 从地图上移除轨迹
    }
    tracks = {};  // 重置轨迹对象
    currentTrack = null;

    // 更新 LocalStorage，删除所有保存的轨迹
    localStorage.removeItem('travelTracks');

    // 清空选择框
    trackSelect.innerHTML = '';
});

// 地理编码 API 的 URL 模板
function getGeocodeUrl(city) {
    return `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(city)}&format=json&limit=1`;
}

// 通过城市名称定位
document.getElementById('locateCityButton').addEventListener('click', function() {
    var cityName = document.getElementById('cityName').value.trim();
    
    if (cityName) {
        var url = getGeocodeUrl(cityName);
        
        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.length > 0) {
                    var latlng = [data[0].lat, data[0].lon];
                    map.setView(latlng, 10); // 定位到该城市，并设置适当的缩放级别

                    if (currentTrack) {
                        currentTrack.addLatLng(latlng); // 添加城市为当前轨迹的节点
                    } else {
                        alert("No track selected. Please create or select a track first.");
                    }
                } else {
                    alert("City not found. Please try a different name.");
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred while locating the city.');
            });
    } else {
        alert("Please enter a city name.");
    }
});
