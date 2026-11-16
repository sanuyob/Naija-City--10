import bpy, math
from mathutils import Vector

# Original Naija City compact hatchback prototype.
# Dimensions are in metres. +Z is forward, +Y is up.
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
    for block in list(datablocks):
        if block.users == 0:
            datablocks.remove(block)

def mat(name, color, metallic=0.0, rough=0.45, alpha=1.0):
    m=bpy.data.materials.new(name)
    m.diffuse_color=(*color,alpha)
    m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value=(*color,alpha)
    bs.inputs['Metallic'].default_value=metallic
    bs.inputs['Roughness'].default_value=rough
    if alpha < 1:
        m.blend_method='BLEND'
        bs.inputs['Alpha'].default_value=alpha
    return m

paint=mat('NC HATCH | Atlantic Teal Metallic',(0.018,0.22,0.25),0.72,0.24)
paint_dark=mat('NC HATCH | Deep Teal Trim',(0.012,0.055,0.062),0.45,0.31)
glass=mat('NC HATCH | Tinted Safety Glass',(0.018,0.07,0.085),0.18,0.11,0.72)
rubber=mat('NC HATCH | Tyre Rubber',(0.012,0.014,0.016),0.02,0.86)
rim=mat('NC HATCH | Brushed Alloy',(0.42,0.48,0.52),0.82,0.23)
rim_dark=mat('NC HATCH | Wheel Barrel',(0.055,0.07,0.08),0.65,0.35)
interior=mat('NC HATCH | Charcoal Interior',(0.025,0.031,0.035),0.08,0.68)
seat=mat('NC HATCH | Graphite Seats',(0.07,0.075,0.08),0.05,0.78)
chrome=mat('NC HATCH | Satin Metal',(0.53,0.58,0.59),0.84,0.24)
lamp=mat('NC HATCH | LED Headlights',(0.85,0.91,1.0),0.18,0.18)
tail=mat('NC HATCH | Red Tail Lamps',(0.65,0.015,0.022),0.15,0.23)
amber=mat('NC HATCH | Amber Indicators',(1.0,0.28,0.015),0.1,0.3)
plate=mat('NC HATCH | Number Plate',(0.85,0.86,0.82),0.05,0.4)
rubber_floor=mat('NC HATCH | Floor and Undertray',(0.026,0.03,0.033),0.25,0.65)

root=bpy.data.objects.new('NC_HATCHBACK_ROOT',None)
bpy.context.collection.objects.link(root)
root.empty_display_type='PLAIN_AXES'
root['vehicle_role']='original game-ready compact hatchback'
root['units']='metres'
root['forward_axis']='+Z'

def parent(obj, par=root):
    obj.parent=par
    return obj

def cube(name, loc, scale, material, bevel=0.0, parent_obj=root):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o=bpy.context.object
    o.name=name
    o.dimensions=scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod=o.modifiers.new('Soft automotive radii','BEVEL')
        mod.width=bevel
        mod.segments=3
        mod.profile=0.5
        o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL')
        bpy.context.view_layer.objects.active=o
        bpy.ops.object.modifier_apply(modifier=mod.name)
    o.data.materials.append(material)
    parent(o,parent_obj)
    return o

def uv_sphere(name, loc, scale, material, parent_obj=root):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, location=loc)
    o=bpy.context.object; o.name=name; o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(material); parent(o,parent_obj)
    return o

def cylinder(name, loc, radius, depth, material, axis='Y', verts=32, parent_obj=root):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=depth, location=loc)
    o=bpy.context.object; o.name=name
    if axis=='X': o.rotation_euler[1]=math.pi/2
    elif axis=='Z': o.rotation_euler[0]=math.pi/2
    o.data.materials.append(material)
    bevel=o.modifiers.new('Machined edge softness','BEVEL');bevel.width=0.018;bevel.segments=2
    o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL')
    parent(o,parent_obj)
    return o

def torus(name, loc, major, minor, material, axis='X', parent_obj=root):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=32, minor_segments=12, location=loc)
    o=bpy.context.object;o.name=name
    if axis=='Y': o.rotation_euler[0]=math.pi/2
    elif axis=='Z': o.rotation_euler[1]=math.pi/2
    o.data.materials.append(material)
    for p in o.data.polygons:p.use_smooth=True
    parent(o,parent_obj)
    return o

# Main lower body, nose, rear hatch and roof.
cube('Body | lower monocoque',(0,0.72,0),(1.86,0.64,4.24),paint,0.20)
cube('Body | front hood',(0,1.02,1.39),(1.76,0.28,1.17),paint,0.12)
cube('Body | rear hatch shoulder',(0,1.03,-1.49),(1.78,0.32,0.92),paint,0.12)
cube('Body | front bumper',(0,0.48,2.16),(1.88,0.28,0.22),paint_dark,0.075)
cube('Body | rear bumper',(0,0.48,-2.16),(1.88,0.28,0.22),paint_dark,0.075)
cube('Body | front lower lip',(0,0.36,2.19),(1.73,0.09,0.22),chrome,0.035)
cube('Body | rear undertray',(0,0.34,-2.14),(1.74,0.11,0.25),rubber_floor,0.03)
cube('Cabin | roof',(0,1.78,-0.11),(1.48,0.18,2.03),paint,0.19)
cube('Cabin | glasshouse base',(0,1.39,-0.10),(1.58,0.68,2.12),paint_dark,0.15)
# Windscreen and rear glass as slanted boxes.
wind=cube('Glass | panoramic windscreen',(0,1.52,0.96),(1.48,0.075,0.96),glass,0.07)
wind.rotation_euler[0]=math.radians(26)
rear=cube('Glass | rear hatch screen',(0,1.53,-1.10),(1.45,0.075,0.78),glass,0.07)
rear.rotation_euler[0]=math.radians(-24)
# Side windows and pillars.
for side,label in [(-1,'Driver'),(1,'Passenger')]:
    x=side*0.792
    cube(f'{label} glass | front door',(x,1.51,0.36),(0.035,0.46,0.88),glass,0.025)
    cube(f'{label} glass | rear quarter',(x,1.53,-0.66),(0.035,0.43,0.72),glass,0.025)
    cube(f'{label} pillar | A',(x,1.49,0.93),(0.09,0.62,0.11),paint_dark,0.035)
    cube(f'{label} pillar | B',(x,1.48,-0.18),(0.09,0.67,0.12),paint_dark,0.035)
    cube(f'{label} pillar | C',(x,1.47,-1.02),(0.10,0.64,0.14),paint_dark,0.035)
    cube(f'{label} sill',(side*0.92,0.54,0.0),(0.10,0.18,2.35),paint_dark,0.045)
    # Side mirrors.
    cube(f'{label} mirror stalk',(side*0.91,1.34,0.92),(0.13,0.09,0.12),chrome,0.03)
    cube(f'{label} side mirror',(side*1.01,1.38,0.91),(0.16,0.20,0.27),paint_dark,0.07)

# Front grille, badge and bumper details.
cube('Front | upper grille',(0,0.71,2.145),(0.78,0.18,0.035),rubber,0.04)
for i in range(5):
    cube(f'Front | grille slat {i+1}',(-0.30+i*0.15,0.71,2.17),(0.025,0.12,0.025),chrome,0.008)
uv_sphere('Front | circular badge',(0,1.00,2.075),(0.11,0.09,0.025),chrome)
for side,label in [(-1,'L'),(1,'R')]:
    cube(f'Front | LED lamp {label}',(side*0.64,0.98,2.11),(0.38,0.19,0.065),lamp,0.08)
    cube(f'Front | amber indicator {label}',(side*0.83,0.91,2.11),(0.08,0.09,0.06),amber,0.025)
    cube(f'Rear | tail light {label}',(side*0.69,1.04,-2.14),(0.28,0.30,0.07),tail,0.07)
    cube(f'Rear | reflector {label}',(side*0.84,0.55,-2.145),(0.08,0.10,0.045),amber,0.02)
cube('Front | number plate',(0,0.55,2.175),(0.54,0.13,0.035),plate,0.025)
cube('Rear | number plate',(0,0.56,-2.18),(0.55,0.14,0.04),plate,0.02)
cube('Rear | hatch handle',(0,1.14,-1.97),(0.35,0.055,0.05),chrome,0.018)
cube('Rear | exhaust tip',(0.60,0.38,-2.15),(0.19,0.11,0.08),chrome,0.025)

# Four independent wheel groups with tyres, rims and six-spoke alloy faces.
wheel_roots=[]
for axle,z in [('Front',1.28),('Rear',-1.28)]:
    for side,x in [('Left',-0.91),('Right',0.91)]:
        pivot=bpy.data.objects.new(f'Wheel_{axle}_{side}_PIVOT',None);bpy.context.collection.objects.link(pivot)
        pivot.location=(x,0.37,z);parent(pivot);wheel_roots.append(pivot)
        torus(f'Tyre_{axle}_{side}',(0,0,0),0.285,0.105,rubber,'Y',pivot)
        cylinder(f'Wheel barrel_{axle}_{side}',(0,0,0),0.285,0.13,rim_dark,'X',32,pivot)
        cylinder(f'Alloy face_{axle}_{side}',(0,0,0),0.218,0.145,rim,'X',32,pivot)
        cylinder(f'Hub_{axle}_{side}',(0,0,0),0.065,0.17,chrome,'X',24,pivot)
        for spoke in range(6):
            a=2*math.pi*spoke/6
            spoke_obj=cube(f'Spoke_{axle}_{side}_{spoke+1}',(0,math.sin(a)*0.13,math.cos(a)*0.13),(0.035,0.19,0.038),rim,0.012,pivot)
            spoke_obj.rotation_euler[0]=a
        cylinder(f'Brake disc_{axle}_{side}',(0,0,0),0.17,0.04,chrome,'X',32,pivot)

# Interior, visible through glass.
cube('Interior | floor',(0,0.90,-0.02),(1.25,0.10,1.92),interior,0.06)
cube('Interior | dashboard',(0,1.20,0.80),(1.38,0.25,0.34),interior,0.08)
cube('Interior | instrument binnacle',(0,1.32,0.68),(0.54,0.16,0.17),paint_dark,0.04)
cube('Interior | centre console',(0,1.06,0.05),(0.28,0.16,0.76),interior,0.06)
for side,label in [(-1,'Driver'),(1,'Passenger')]:
    x=side*0.39
    cube(f'{label} seat | cushion',(x,1.05,-0.45),(0.59,0.22,0.65),seat,0.09)
    seatback=cube(f'{label} seat | backrest',(x,1.36,-0.75),(0.59,0.76,0.22),seat,0.09)
    seatback.rotation_euler[0]=math.radians(-7)
    cube(f'{label} seat | headrest',(x,1.78,-0.80),(0.32,0.28,0.18),seat,0.07)
# Steering wheel as a dedicated visual component.
steer_pivot=bpy.data.objects.new('Steering_Wheel_PIVOT',None);bpy.context.collection.objects.link(steer_pivot);steer_pivot.location=(-0.39,1.37,0.52);parent(steer_pivot)
torus('Steering_Wheel_Ring',(0,0,0),0.17,0.024,chrome,'X',steer_pivot)
cube('Steering_Wheel_Spoke_V',(0,0,0),(0.035,0.20,0.035),chrome,0.01,steer_pivot)
cube('Steering_Wheel_Spoke_H',(0,0,0),(0.20,0.035,0.035),chrome,0.01,steer_pivot)
# Door panels are separate, lightweight components with named hinge pivots.
for side,label in [(-1,'Driver'),(1,'Passenger')]:
    hinge=bpy.data.objects.new(f'{label}_Door_Hinge',None);bpy.context.collection.objects.link(hinge);hinge.location=(side*0.93,0.93,0.57);parent(hinge)
    door=cube(f'{label}_Door_Panel',(side*0.93,0.91,-0.08),(0.075,0.49,1.28),paint,0.055,hinge)
    door.location=(0,-0.02,-0.65)
    handle=cube(f'{label}_Door_Handle',(side*0.98,1.03,0.26),(0.045,0.045,0.23),chrome,0.018,hinge)
    handle.location=(0.045*side,0.10,-0.31)
    # Expose a clean hinge origin for a future open/close state animation.
    hinge['animation']='rotate local Y to open; opposite signs for each side'

# Roof antenna and a minimal rear wiper.
cube('Roof | antenna',(0,1.90,-0.78),(0.035,0.14,0.045),paint_dark,0.015)
cube('Rear | wiper arm',(0,1.55,-1.50),(0.62,0.025,0.03),rubber,0.01)
# Contact and scale metadata are useful to game integration.
root['wheelbase_m']=2.56
root['body_width_m']=1.86
root['body_length_m']=4.55
root['wheel_centres_local']=[[-0.91,0.37,1.28],[0.91,0.37,1.28],[-0.91,0.37,-1.28],[0.91,0.37,-1.28]]
root['performance_note']='Modular low-poly-ish prototype; physics should use a simple box chassis and four separate wheel pivots.'

# Smooth shading where appropriate.
for obj in bpy.context.scene.objects:
    if obj.type=='MESH':
        for poly in obj.data.polygons:
            if 'Tyre' in obj.name or 'Wheel' in obj.name or 'Alloy' in obj.name:
                poly.use_smooth=True

# Select root to make project scene easy to inspect.
bpy.ops.object.select_all(action='DESELECT')
root.select_set(True);bpy.context.view_layer.objects.active=root

# Set world / export.
scene=bpy.context.scene
scene.render.engine='BLENDER_EEVEE'
scene.render.resolution_x=1024;scene.render.resolution_y=576;scene.render.resolution_percentage=100
out='/workspace/naija-city-compact-hatchback.glb'
bpy.ops.export_scene.gltf(filepath=out,export_format='GLB',export_apply=True,export_animations=False,export_cameras=False,export_lights=False,export_yup=True,export_materials='EXPORT')
print('EXPORTED',out)
print('OBJECTS',len(scene.objects),'MESHES',sum(o.type=='MESH' for o in scene.objects),'POLYGONS',sum(len(o.data.polygons) for o in scene.objects if o.type=='MESH'))

