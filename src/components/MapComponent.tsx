import { defaults as defaultControls } from 'ol/control'
import { Style, Circle, Fill, Stroke } from 'ol/style'
import { useEffect, useRef, useState } from 'react'
import { CheckSquare, Square } from 'lucide-react'
import { Feature, Map, Overlay, View } from 'ol'
import { useNavigate } from 'react-router-dom'
import VectorSource from 'ol/source/Vector'
import VectorLayer from 'ol/layer/Vector'
import TileLayer from 'ol/layer/Tile'
import { fromLonLat } from 'ol/proj'
import { Point } from 'ol/geom'
import { OSM } from 'ol/source'


interface EquipmentState {
  name: string
  color: string
  isSelected: boolean
}

interface EquipmentPoint {
  equipmentId: string
  stateId: string
  lat: number
  lon: number
  equipmentName: string
}

function MapComponent() {
  const navigate = useNavigate()

  const [points, setPoints] = useState<EquipmentPoint[]>([])
  const [states, setStates] = useState<Record<string, EquipmentState>>({
    '0808344c-454b-4c36-89e8-d7687e692d57': {
      name: 'Operando',
      color: '#2ecc71',
      isSelected: true
    },
    'baff9783-84e8-4e01-874b-6fd743b875ad': {
      name: 'Parado',
      color: '#f1c40f',
      isSelected: true
    },
    '03b2d446-e3ba-4c82-8dc2-a5611fea6e1f': {
      name: 'Manutenção',
      color: '#e74c3c',
      isSelected: true
    }
  })

  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<Map | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<Overlay | null>(null)
  const [tooltipContent, setTooltipContent] = useState<EquipmentPoint | null>(null)
  const vectorLayerRef = useRef<VectorLayer<VectorSource> | null>(null)

  useEffect(() => {
    async function fetchEquipmentData() {
      const [positionRes, stateRes, equipRes, modelRes] = await Promise.all([
        fetch('/dados/equipmentPositionHistory.json'),
        fetch('/dados/equipmentStateHistory.json'),
        fetch('/dados/equipment.json'),
        fetch('/dados/equipmentModel.json'),
      ])

      const positionsData = await positionRes.json()
      const statesData = await stateRes.json()
      const equipData = await equipRes.json()



      const stateMap = statesData.map(item => {
        return {
          equipmentId: item.equipmentId,
          stateId: item.states[item.states.length - 1].equipmentStateId
        }
      })      

      const result = positionsData.map((item, index) => {
        
        const lastPosition = item.positions[item.positions.length - 1]
        const lastState = stateMap[index].stateId
        const equipmentName = equipData[index].name
        
        return {
          equipmentId: item.equipmentId,
          stateId: lastState ?? '',
          equipmentName,
          lat: lastPosition?.lat ?? 0,
          lon: lastPosition?.lon ?? 0
        }
      })
      
      setPoints(result)
    }

    fetchEquipmentData()
  }, [])

  useEffect(() => {
    if (!mapRef.current || !tooltipRef.current || mapInstanceRef.current) return

    overlayRef.current = new Overlay({
      element: tooltipRef.current,
      offset: [10, 0],
      positioning: 'bottom-left'
    })

    const filteredPoints = points.filter(point => states[point.stateId]?.isSelected)

    const features = filteredPoints.map(point => {
      const feature = new Feature({
        geometry: new Point(fromLonLat([point.lon, point.lat])),
        properties: point
      })

      const color = states[point.stateId]?.color || '#000'

      feature.setStyle(
        new Style({
          image: new Circle({
            radius: 8,
            fill: new Fill({ color }),
            stroke: new Stroke({ color: '#fff', width: 2 })
          })
        })
      )

      return feature
    })

    const vectorLayer = new VectorLayer({
      source: new VectorSource({ features })
    })

    vectorLayerRef.current = vectorLayer

    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({ source: new OSM() }),
        vectorLayer
      ],
      controls: defaultControls({ rotate: false, attribution: false }),
      view: new View({
        center: fromLonLat([-43.1729, -22.9068]),
        zoom: 5
      })
    })

    map.addOverlay(overlayRef.current)

    map.on('pointermove', evt => {
      const feature = map.forEachFeatureAtPixel(evt.pixel, feature => feature)
      if (feature) {
        const point = feature.get('properties')

        setTooltipContent(point)
        overlayRef.current?.setPosition(evt.coordinate)
      } else {
        setTooltipContent(null)
      }
    })

    map.on('click', evt => {
      const feature = map.forEachFeatureAtPixel(evt.pixel, f => f)
      if (feature) {
        const point = feature.get('properties')
        navigate(`/equipment/${point.equipmentId}`)
      }
    })
    

    mapInstanceRef.current = map

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setTarget(undefined)
        mapInstanceRef.current = null
      }
    }
  }, [points, states])

  const toggleStateVisibility = (stateId: string) => {
    setStates(prev => ({
      ...prev,
      [stateId]: {
        ...prev[stateId],
        isSelected: !prev[stateId].isSelected
      }
    }))
  }

  return (
    <div className='min-h-screen bg-gray-900'>
      <div className='container mx-auto p-4'>
        <h1 className='text-2xl font-bold mb-4 text-white'>Mapa de Equipamentos</h1>

        <div className='relative'>
          <div
            ref={mapRef}
            className='w-full h-[600px] rounded-lg shadow-lg mb-4 overflow-hidden'
          />

          <div
            ref={tooltipRef}
            className={`absolute z-50 bg-white rounded-lg shadow-lg p-3 pointer-events-none transition-opacity duration-200 ${
              tooltipContent ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {tooltipContent && (
              <>
                <p>Estado: </p><p className='text-sm text-gray-600'>{states[tooltipContent.stateId]?.name}</p>
                <p>Nome: </p><p className='text-sm text-gray-600'> {tooltipContent?.equipmentName}</p>
              </>
            )}
          </div>

          <div className='absolute top-4 right-4 bg-white p-4 rounded-lg shadow-md'>
            <h2 className='text-lg font-semibold mb-2'>Estados</h2>
            <div className='space-y-2'>
              {Object.entries(states).map(([id, state]) => (
                <button
                  key={id}
                  className='flex items-center gap-2 w-full px-3 py-2 rounded-md hover:bg-gray-50'
                  onClick={() => toggleStateVisibility(id)}
                >
                  {state.isSelected ? (
                    <CheckSquare className='w-5 h-5 text-gray-600' />
                  ) : (
                    <Square className='w-5 h-5 text-gray-600' />
                  )}
                  <div
                    className='w-4 h-4 rounded-full'
                    style={{ backgroundColor: state.color }}
                  />
                  <span className='text-gray-700'>{state.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MapComponent
