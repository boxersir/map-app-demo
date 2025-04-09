import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from 'mapbox-gl-geocoder';

// 替换为你的 Mapbox Access Token
mapboxgl.accessToken = 'pk.eyJ1IjoieWFuZ2ppYW4iLCJhIjoiY2phaG1neno0MXFkNDMzbWhwNWw0bWM4aiJ9.CFmrh0LVWAbmVeed-Xr7wA';

let map;
const MapComponent = () => {
  const mapContainerRef = useRef(null);
  function rotate() {
    let center = map.getCenter();
    map.easeTo({
        center: [center.lng + 40, center.lat],
        zoom: 2,
        speed: 0.5
    })
    requestAnimationFrame(rotate);
}
  useEffect(() => {
    map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v11',
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
    map.addControl(new mapboxgl.NavigationControl());
    map.flyTo({
        center: [112.92850, 28.18],
        zoom: 14,
        speed: 0.4,
        pitch: 60,
    })
    map.on('load', () => {
        map.addSource('mapbox-dem', {
        'type': 'raster-dem',
        'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
        'tileSize': 512,
        'maxzoom': 14
        });
        map.addControl(new mapboxgl.FullscreenControl());
        map.addControl(new mapboxgl.GeolocateControl({
            positionOptions: {
                enableHighAccuracy: true
            },
            trackUserLocation: true
        }));
        map.addControl(new mapboxgl.ScaleControl({
            maxWidth: 200,
            unit: 'metric'
        }), 'bottom-left');
        map.addControl(new MapboxGeocoder({
            accessToken: mapboxgl.accessToken,
            mapboxgl: mapboxgl
        }), 'top-left');
        map.addControl(new mapboxgl.NavigationControl(), 'top-left');

        map.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });
    });
    setTimeout(() => {
        rotate();
    },20000)
    // 清理地图实例
    return () => map.remove();
  }, []);

  return <div ref={mapContainerRef} style={{ width: '100%', height: '500px' }} />;
};

export default MapComponent;