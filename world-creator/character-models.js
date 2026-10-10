// Recognizable low-poly preview figures for the WVLRP creator.
// Geometry only: these are NOT rigged or production-quality player models.
// One palette per preview refresh keeps materials shared across large herds.
export function makeFigureBuilder(B, scene, track) {
  const mats = new Map();
  function mat(color) {
    if (!mats.has(color)) {
      const m = track(new B.StandardMaterial("figure-" + color.slice(1), scene));
      m.diffuseColor = B.Color3.FromHexString(color);
      m.specularColor = new B.Color3(.07, .07, .07);
      mats.set(color, m);
    }
    return mats.get(color);
  }
  function root(o, x, y, z) {
    const r = track(new B.TransformNode("figure-" + o.id, scene));
    r.position.set(x, y, z);
    const id = String(o.id || o.name || "");
    let n = 0;
    for (let i = 0; i < id.length; i++) n = (Math.imul(n, 31) + id.charCodeAt(i)) >>> 0;
    r.rotation.y = ((n % 360) / 180) * Math.PI;
    return { node: r, variation: n };
  }
  function oval(r, label, pos, size, color, segments = 10) {
    const mesh = track(B.MeshBuilder.CreateSphere(label, { diameter: 1, segments }, scene));
    mesh.parent = r;
    mesh.position.set(...pos);
    mesh.scaling.set(...size);
    mesh.material = mat(color);
    return mesh;
  }
  function box(r, label, pos, size, color) {
    const mesh = track(B.MeshBuilder.CreateBox(label, {
      width: size[0], height: size[1], depth: size[2]
    }, scene));
    mesh.parent = r;
    mesh.position.set(...pos);
    mesh.material = mat(color);
    return mesh;
  }
  function limb(r, label, from, to, width, color, tipWidth = width * .82) {
    const a = new B.Vector3(...from), b = new B.Vector3(...to);
    const delta = b.subtract(a);
    const mesh = track(B.MeshBuilder.CreateCylinder(label, {
      height: delta.length(), diameterTop: tipWidth, diameterBottom: width, tessellation: 7
    }, scene));
    mesh.parent = r;
    mesh.position.copyFrom(a.add(b).scale(.5));
    const v = delta.normalize(), up = B.Vector3.Up();
    const dot = B.Vector3.Dot(up, v);
    if (dot < -.999) mesh.rotationQuaternion = new B.Quaternion(1, 0, 0, 0);
    else {
      const c = B.Vector3.Cross(up, v);
      mesh.rotationQuaternion = new B.Quaternion(c.x, c.y, c.z, 1 + dot).normalize();
    }
    mesh.material = mat(color);
    return mesh;
  }

  function deer(o, x, ground, z) {
    const isFox = o.type === "animal";
    const r = root(o, x, ground, z);
    // Deer variations help a herd read as animals rather than repeated identical props.
    const young = !isFox && r.variation % 9 === 0;
    const buck = !isFox && !young && r.variation % 3 === 0;
    const fur = isFox ? "#b76b38" : r.variation % 2 ? "#aa7550" : "#b88962";
    const belly = isFox ? "#f1d0a3" : "#e8d3b5";
    const dark = "#382f2b";
    const hoof = "#292625";
    if (young) r.node.scaling.set(.76, .76, .76);
    if (isFox) r.node.scaling.set(.63, .65, .7);
    // Deer face toward local +Z. Individual root headings are stable across visits.
    oval(r.node, "body", [0, 1.56, 0], [1.12, 1.06, 2.1], fur);
    oval(r.node, "underside", [0, 1.30, .18], [.78, .47, 1.55], belly);
    oval(r.node, "haunches", [0, 1.47, -.66], [1.06, 1.02, .92], fur);
    limb(r.node, "neck", [0, 1.75, .72], [0, 2.30, 1.04], .48, fur, .39);
    oval(r.node, "head", [0, 2.31, 1.28], [.50, .47, .62], fur);
    oval(r.node, "muzzle", [0, 2.19, 1.62], [.29, .24, .41], belly);
    oval(r.node, "nose", [0, 2.19, 1.86], [.21, .17, .13], dark);
    for (const side of [-1, 1]) {
      const sx = side * .44;
      oval(r.node, "ear", [sx, 2.57, 1.17], [.37, .49, .17], fur);
      oval(r.node, "ear inside", [sx, 2.58, 1.27], [.23, .30, .07], "#d9a79c");
      oval(r.node, "eye", [side * .225, 2.35, 1.53], [.09, .09, .075], dark);
      // Front legs, knees and split hooves.
      limb(r.node, "front upper", [side * .40, 1.35, .66], [side * .43, .67, .77], .19, fur);
      limb(r.node, "front lower", [side * .43, .67, .77], [side * .43, .16, .76], .13, fur);
      box(r.node, "front hoof", [side * .43, .09, .84], [.20, .17, .31], hoof);
      // Hind legs have a characteristic bend at the hock.
      limb(r.node, "hind thigh", [side * .40, 1.40, -.73], [side * .45, .76, -.88], .23, fur);
      limb(r.node, "hind hock", [side * .45, .76, -.88], [side * .45, .45, -.62], .16, fur);
      limb(r.node, "hind lower", [side * .45, .45, -.62], [side * .46, .15, -.81], .12, fur);
      box(r.node, "hind hoof", [side * .46, .09, -.74], [.21, .18, .30], hoof);
      if (buck) {
        const ax = side * .20;
        limb(r.node, "antler base", [ax, 2.64, 1.27], [side * .26, 2.94, 1.21], .105, "#d4bc8f");
        limb(r.node, "antler beam", [side * .26, 2.94, 1.21], [side * .57, 3.25, 1.10], .086, "#d4bc8f");
        limb(r.node, "antler tine", [side * .40, 3.09, 1.15], [side * .42, 3.34, 1.26], .06, "#d4bc8f");
      }
    }
    if (isFox) {
      oval(r.node, "fox tail", [0, 1.51, -1.26], [.48, .42, 1.20], fur);
      oval(r.node, "fox tail tip", [0, 1.54, -1.81], [.35, .34, .36], belly);
      for (const side of [-1, 1])
        oval(r.node, "fox pointed ear", [side * .25, 2.63, 1.22], [.24, .50, .22], fur);
    } else {
      oval(r.node, "white tail", [0, 1.78, -1.08], [.38, .36, .57], belly);
    }
    return r.node;
  }

  function person(o, x, ground, z) {
    const r = root(o, x, ground, z), preset = o.body || "average";
    const width = { slim:.82, athletic:1.13, stocky:1.28, tall:1, short:1 }[preset] || 1;
    const height = preset === "tall" ? 1.14 : preset === "short" ? .86 : 1;
    r.node.scaling.set(width, height, width);
    const outfit = o.outfit || "ranger";
    const clothes = ({
      ranger:["#426a45","#6c5a3a"],
      casual:["#5078ad","#304154"],
      hiking:["#c78738","#465d51"],
      lifeguard:["#dc4e42","#e9caa2"],
      mercantile:["#855f80","#413a37"]
    })[outfit] || ["#5078ad","#304154"];
    const hair = ({
      brown:"#4d3427", red:"#a54a28", blonde:"#deb96b", black:"#272527",
      gray:"#8e8f89", white:"#eee8d9"
    })[o.hair] || "#4d3427";
    const skin = "#d8ac87", shoes = "#2f2926";
    // Shoes, distinct legs, torso/waist, separate arms, hands, neck and face.
    for (const side of [-1, 1]) {
      limb(r.node, "upper trouser", [side * .19, .96, 0], [side * .20, .52, .015], .28, clothes[1], .23);
      limb(r.node, "lower trouser", [side * .20, .52, .015], [side * .19, .14, .04], .225, clothes[1], .20);
      box(r.node, "shoe", [side * .19, .085, .10], [.27, .17, .43], shoes);
      limb(r.node, "sleeve", [side * .39, 1.61, 0], [side * .56, 1.22, 0], .24, clothes[0], .19);
      limb(r.node, "forearm", [side * .56, 1.22, 0], [side * .55, .90, .12], .17, skin);
      oval(r.node, "hand", [side * .55, .85, .12], [.17, .21, .17], skin);
    }
    oval(r.node, "shirt and chest", [0, 1.43, 0], [.82, .76, .45], clothes[0]);
    oval(r.node, "waist", [0, 1.02, 0], [.67, .30, .43], clothes[1]);
    limb(r.node, "neck", [0, 1.73, 0], [0, 1.91, 0], .17, skin);
    const face = o.face || "oval";
    const faceSize = face === "round" ? [.45,.48,.43] : face === "long" ? [.37,.58,.42] :
      face === "square" ? [.44,.48,.42] : [.40,.52,.42];
    oval(r.node, "face and head", [0, 2.11, .005], faceSize, skin, 12);
    oval(r.node, "hair crown", [0, 2.36, -.04], [.44,.24,.45], hair, 10);
    for (const side of [-1, 1]) {
      oval(r.node, "eye", [side * .105, 2.14, .206], [.048, .049, .025], "#302923");
      oval(r.node, "hair side", [side * .22, 2.23, -.045], [.09,.23,.27], hair);
    }
    oval(r.node, "nose", [0, 2.045, .225], [.075,.105,.10], skin);
    if (outfit === "ranger") {
      box(r.node, "ranger hat brim", [0, 2.44, .15], [.60,.045,.48], "#34543a");
      oval(r.node, "ranger hat", [0, 2.53, -.03], [.46,.22,.46], "#34543a");
    }
    return r.node;
  }
  return { deer, person };
}
