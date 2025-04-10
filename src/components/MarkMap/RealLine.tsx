import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from 'mapbox-gl-geocoder';
import 'mapbox-gl/dist/mapbox-gl.css';
import * as turf from '@turf/turf'
const motorcycleIconUrl = 'https://cdn-icons-png.flaticon.com/512/2972/2972185.png';

// 路线坐标点数组
let routeCoordinates = [];
let motorcycleAnimationId = null;

// 替换为你的 Mapbox Access Token
const MapComponent = () => {
  const mapContainerRef = useRef(null);
    const mapRef = useRef();
     // 获取路线函数
     async function getRoute(start, end) {
        // 使用Mapbox Directions API获取路线
        const query = await fetch(
            `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&access_token=${mapboxgl.accessToken}`,
            { method: 'GET' }
        );
        const json = await query.json();
        
        // 获取路线坐标
        routeCoordinates = json.routes[0].geometry.coordinates;
        
        // 更新路线显示
        mapRef.current.getSource('route').setData({
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'LineString',
                coordinates: routeCoordinates
            }
        });
        
        // 重置摩托车位置到起点
        mapRef.current.getSource('motorcycle').setData({
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: routeCoordinates[0]
                },
                properties: {
                    bearing: 0
                }
            }]
        });
        
        // 调整地图视野以包含整个路线
        const bounds = routeCoordinates.reduce((bounds, coord) => {
            return bounds.extend(coord);
        }, new mapboxgl.LngLatBounds(routeCoordinates[0], routeCoordinates[0]));
        
        mapRef.current.fitBounds(bounds, {
            padding: 50,
            maxZoom: 15
        });
    }
    // 动画摩托车沿路线移动
    function animateMotorcycle() {
        const startTime = Date.now();
        const duration = 60000; // 60秒完成全程
        const line = turf.lineString(routeCoordinates);
        const routeLength = turf.length(line, {units: 'kilometers'});
        const speed = routeLength / (duration / 1000 / 60 / 60); // km/h
        
        // 停止任何正在进行的动画
        if (motorcycleAnimationId) {
            cancelAnimationFrame(motorcycleAnimationId);
        }
        
        function updatePosition() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // 计算沿路线行进的距离
            const alongDistance = progress * routeLength;
            const along = turf.along(line, alongDistance, {units: 'kilometers'});
            const currentLng = along.geometry.coordinates[0];
            const currentLat = along.geometry.coordinates[1];
            
            // 计算方向角度 - 使用当前位置和前方一小段距离的点来计算
            let bearing = 0;
            if (progress < 0.99) {
                const nextAlong = turf.along(line, alongDistance + 0.01, {units: 'kilometers'});
                bearing = turf.bearing(
                    turf.point([currentLng, currentLat]),
                    turf.point(nextAlong.geometry.coordinates)
                );
            }
            
            // 更新摩托车位置和方向
            mapRef.current.getSource('motorcycle').setData({
                type: 'FeatureCollection',
                features: [{
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [currentLng, currentLat]
                    },
                    properties: {
                        bearing: bearing
                    }
                }]
            });
            
            // 让地图跟随摩托车
            mapRef.current.setCenter([currentLng, currentLat]);
            
            // 显示速度信息
            document.getElementById('startBtn').textContent = `行驶中 ${speed.toFixed(1)} km/h`;
            
            // 继续动画直到完成
            if (progress < 1) {
                motorcycleAnimationId = requestAnimationFrame(updatePosition);
            } else {
                document.getElementById('startBtn').textContent = '到达目的地';
            }
        }
        
        updatePosition();
    }
  useEffect(() => {
    mapboxgl.accessToken = 'pk.eyJ1IjoieWFuZ2ppYW4iLCJhIjoiY2phaG1neno0MXFkNDMzbWhwNWw0bWM4aiJ9.CFmrh0LVWAbmVeed-Xr7wA';
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-74.5, 40], // 初始中心点坐标
        zoom: 9, // 初始缩放级别
      projection: 'globe', // 坐标系
      config: {
        basemap: {
          lightPreset:'night'
        }
      }
    });

    // 添加控制条
    // mapRef.current.addControl(new mapboxgl.NavigationControl());
    // mapRef.current.flyTo({
    //     center: [112.92850, 28.18],
    //     zoom: 14,
    //     speed: 0.4,
    //     pitch: 60,
    // })
      mapRef.current.on('load', () => {
        mapRef.current.on('click', (e) => {
            if (routeCoordinates.length === 0) {
                // 如果还没有路线，设置起点
                routeCoordinates = [e.lngLat.toArray()];
            } else {
                // 否则设置终点并获取路线
                const start = routeCoordinates[0];
                const end = e.lngLat.toArray();
                getRoute(start, end);
            }
        });
        // 加载摩托车图标
        mapRef.current.loadImage(motorcycleIconUrl, (error, image) => {
            if (error) throw error;
            mapRef.current.addImage('motorcycle-icon', image);
            
            // 添加摩托车源
            mapRef.current.addSource('motorcycle', {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: [{
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: [-74.5, 40] // 起点
                        },
                        properties: {
                            bearing: 0
                        }
                    }]
                }
            });
            
            // 添加摩托车图层
            mapRef.current.addLayer({
                id: 'motorcycle-layer',
                type: 'symbol',
                source: 'motorcycle',
                layout: {
                    'icon-image': 'motorcycle-icon',
                    'icon-size': 0.1,
                    'icon-rotate': ['get', 'bearing'],
                    'icon-rotation-alignment': 'map',
                    'icon-allow-overlap': true
                }
            });
            
            // 添加路线源
            mapRef.current.addSource('route', {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'LineString',
                        coordinates: []
                    }
                }
            });
            
            // 添加路线图层
            mapRef.current.addLayer({
                id: 'route',
                type: 'line',
                source: 'route',
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                paint: {
                    'line-color': '#3bb2d0',
                    'line-width': 4
                }
            });
            
            // 设置默认路线（天安门到故宫北门）
            getRoute([116.404, 39.915], [116.403, 39.925]);
        });
      mapRef.current.addSource('mapbox-dem', {
        'type': 'raster-dem',
        'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
        'tileSize': 512,
        'maxzoom': 14
        });
        mapRef.current.addControl(new mapboxgl.FullscreenControl());
        mapRef.current.addControl(new mapboxgl.GeolocateControl({
            positionOptions: {
                enableHighAccuracy: true
            },
            trackUserLocation: true
        }));
        mapRef.current.addControl(new mapboxgl.ScaleControl({
            maxWidth: 200,
            unit: 'metric'
        }), 'bottom-left');
        mapRef.current.addControl(new MapboxGeocoder({
            accessToken: mapboxgl.accessToken,
            mapboxgl: mapboxgl
        }), 'top-left');
        mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-left');

        mapRef.current.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });
    });
    // setTimeout(() => {
    //     // rotate();
    // },20000)
    // 清理地图实例
    return () => mapRef.current.remove();
  }, []);

    return <>
        <div id="startBtn"></div>
        <button onClick={animateMotorcycle}>启动</button>
        <div ref={mapContainerRef} style={{ width: '100%', height: '500px' }} />
    </>;
};

export default MapComponent;