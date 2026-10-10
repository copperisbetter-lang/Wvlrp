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

  // Adult character preview. Higher facial and clothing detail than the initial
  // capsule proxy, but geometry is still procedural (not photogrammetry / scanned).
  function person(o, x, ground, z) {
    const r = root(o, x, ground, z);
    const woman = (o.gender || "woman") !== "man";
    const body = o.body || "average";
    const width = ({ slim:.87, athletic:1.06, stocky:1.20, tall:1, short:1 })[body] || 1;
    const height = body === "tall" ? 1.12 : body === "short" ? .88 : 1;
    r.node.scaling.set(width, height, width);
    const outfit = o.outfit || "ranger";
    const outfits = {
      ranger:["#466a48","#594f36","#d8c299"],
      casual:["#547d9b","#333b4e","#f0ebdd"],
      hiking:["#cb8539","#526b58","#d4ad79"],
      lifeguard:["#d4483a","#3a5370","#f3e3d7"],
      mercantile:["#805b79","#403745","#f6dce6"]
    };
    const colors = outfits[outfit] || outfits.casual;
    const shirt = colors[0], pants = colors[1], detail = colors[2];
    const hair = ({
      brown:"#4d3124",red:"#ac4d28",blonde:"#ddb870",black:"#292324",
      gray:"#85857f",white:"#ece8d9"
    })[o.hair] || "#4d3124";
    const skin = ({
      fair:"#ebc4ad",light:"#d9a98b",tan:"#c48d65",
      brown:"#986442",deep:"#633d2c"
    })[o.skin] || "#d9a98b";
    const blush = ({
      fair:"#c98386",light:"#bd7f70",tan:"#a66858",
      brown:"#88584c",deep:"#754d46"
    })[o.skin] || "#bd7f70";
    const eye = "#453729", iris = "#578271", lip = blush;
    const shoes="#302e2c", shadow="#382a24";
    const hips = woman ? .74 : .71, shoulders = woman ? .69 : .90;
    const hairStyle=o.hairStyle || "wavy";
    const pale="#f3eae0";

    for (const side of [-1, 1]) {
      const sx=side;
      // Long legs, separate knees, ankles, trouser creases and shoes.
      limb(r.node,"thigh",[sx*.19,.99,0],[sx*.20,.59,.006],.245,pants,.224);
      oval(r.node,"knee",[sx*.20,.56,.009],[.245,.29,.25],pants);
      limb(r.node,"calf",[sx*.20,.53,0],[sx*.19,.14,.025],.21,pants,.175);
      oval(r.node,"ankle",[sx*.19,.15,.032],[.205,.23,.22],pants);
      oval(r.node,"boot",[sx*.19,.10,.114],[.30,.21,.43],shoes);

      // Shoulders follow the selected body silhouette; arms are relaxed.
      oval(r.node,"shoulder",[sx*shoulders*.48,1.62,-.005],[.30,.30,.36],shirt);
      limb(r.node,"upper sleeve",[sx*shoulders*.48,1.55,0],[sx*(shoulders*.50+.16),1.29,.015],.25,shirt,.195);
      limb(r.node,"forearm",[sx*(shoulders*.50+.16),1.28,.018],[sx*(shoulders*.50+.16),.95,.07],.165,skin,.135);
      oval(r.node,"hand",[sx*(shoulders*.50+.16),.886,.092],[.168,.237,.143],skin,12);
    }

    // Layered torso gives a defined waist, chest, jacket/shirt collar and belt.
    oval(r.node,"hips",[0,1.015,-.015],[hips,.43,.47],pants,14);
    oval(r.node,"waist",[0,1.205,-.015],[woman?.60:.71,.43,.39],shirt,14);
    oval(r.node,"chest",[0,1.495,-.015],[shoulders+.08,.63,.46],shirt,16);
    if (woman) {
      // Clothing silhouette only; no uncovered anatomy.
      oval(r.node,"tailored shirt",[0,1.45,.09],[.74,.42,.37],shirt,14);
    }
    box(r.node,"belt",[0,1.068,.215],[hips*.96,.075,.1],"#39362c");
    box(r.node,"belt buckle",[0,1.068,.274],[.13,.075,.045],"#b9a36b");

    // Neck, ears, jaw/cheeks, eye sockets and chin.
    limb(r.node,"neck",[0,1.68,0],[0,1.93,0],.23,skin,.195);
    const face=o.face||"oval";
    const shape=face==="round" ? [.445,.46,.417] :
      face==="long" ? [.371,.58,.408] :
      face==="square" ? [.435,.46,.397] :
      face==="heart" ? [.422,.50,.40] : [.399,.515,.405];
    const cy=2.15;
    oval(r.node,"head",[0,cy,.005],shape,skin,20);
    if(face==="heart")
      oval(r.node,"chin",[0,1.948,.115],[.20,.18,.235],skin,12);
    for(const side of [-1,1]) {
      const sx=side;
      oval(r.node,"ear",[sx*(shape[0]*.52),2.115,.009],[.145,.22,.11],skin,12);
      oval(r.node,"cheek",[sx*.13,2.054,.17],[.195,.14,.10],skin,14);
      // Eye white, iris, pupil, lids, separate lashes and eyebrows.
      oval(r.node,"eye white",[sx*.129,2.175,.213],[.132,.085,.051],pale,14);
      oval(r.node,"iris",[sx*.127,2.177,.254],[.063,.062,.027],iris,14);
      oval(r.node,"pupil",[sx*.125,2.179,.269],[.028,.032,.015],eye,12);
      oval(r.node,"upper eyelid",[sx*.131,2.225,.215],[.150,.028,.051],shadow,12);
      oval(r.node,"eyebrow",[sx*.137,2.297,.214],[.169,.031,.054],hair,12);
      if(woman) {
        limb(r.node,"eyelash",[sx*.198,2.224,.239],[sx*.237,2.244,.237],.022,shadow,.014);
        oval(r.node,"blush",[sx*.185,2.058,.24],[.14,.073,.021],blush,10);
      }
    }
    oval(r.node,"nose bridge",[0,2.116,.254],[.105,.19,.115],skin,14);
    oval(r.node,"nose tip",[0,2.052,.30],[.148,.086,.094],skin,14);
    oval(r.node,"upper lip",[0,1.975,.275],[.195,.043,.04],lip,12);
    oval(r.node,"lower lip",[0,1.952,.27],[.174,.050,.04],lip,12);
    oval(r.node,"smile line",[0,1.969,.312],[.132,.015,.012],"#733d35",12);

    // A fitted hair cap rather than a floating ball on top of the head.
    oval(r.node,"hair top",[0,2.409,-.042],[shape[0]*1.13,.23,.433],hair,18);
    oval(r.node,"hair back",[0,2.28,-.255],[shape[0]*1.02,.37,.27],hair,16);
    const length = hairStyle==="short" ? .09 : hairStyle==="bob" ? .30 :
      hairStyle==="ponytail" ? .15 : .76;
    for(const side of [-1,1]) {
      const sx=side;
      oval(r.node,"hair temple",[sx*(shape[0]*.41),2.275,.063],[.11,.23,.22],hair,14);
      if(hairStyle!=="ponytail" && length>.10) {
        const long=length>.55;
        oval(r.node,"hair around face",[sx*(shape[0]*.43),2.10,-.08],
          [.17,long?.59:.39,.315],hair,16);
        oval(r.node,"hair shoulder",[sx*.355,long?1.65:1.89,-.11],
          [.17,long?.44:.21,.33],hair,16);
        if(hairStyle==="wavy") {
          oval(r.node,"wave curl",[sx*.365,1.54,-.09],[.20,.28,.32],hair,14);
          oval(r.node,"wave end",[sx*.37,1.33,-.06],[.18,.26,.25],hair,14);
        }
      }
    }
    if(hairStyle==="ponytail") {
      oval(r.node,"pony tie",[0,2.319,-.405],[.17,.15,.16],detail,10);
      oval(r.node,"ponytail upper",[0,2.09,-.497],[.25,.47,.26],hair,14);
      oval(r.node,"ponytail lower",[0,1.80,-.50],[.21,.39,.22],hair,14);
    }
    // Wispy layered forelock without covering the eyes.
    if(hairStyle!=="short") {
      oval(r.node,"side part",[woman?-.15:0,2.389,.265],[.26,.11,.19],hair,14);
    }

    if(outfit==="ranger") {
      // Collar, embroidered-style crest, sleeve patch and dark uniform shoes.
      for(const side of [-1,1]) {
        const sx=side;
        oval(r.node,"shirt collar",[sx*.145,1.756,.208],[.19,.15,.095],detail,12);
        oval(r.node,"sleeve patch",[sx*(shoulders*.52),1.55,.26],[.12,.14,.045],detail,10);
      }
      oval(r.node,"ranger badge",[-.22,1.54,.235],[.17,.20,.045],"#d1b373",12);
      // Secretary hair is visible; ranger hat reserved for short-haired outdoor variants.
      if(!woman && hairStyle==="short") {
        box(r.node,"hat brim",[0,2.483,.107],[.70,.045,.56],"#36573a");
        oval(r.node,"hat crown",[0,2.555,-.018],[.46,.21,.42],"#36573a",12);
      }
    } else if(outfit==="mercantile") {
      oval(r.node,"store name tag",[-.18,1.54,.226],[.26,.11,.046],detail,12);
    } else if(outfit==="lifeguard") {
      oval(r.node,"lifeguard crest",[-.20,1.52,.233],[.17,.13,.045],pale,12);
    }
    return r.node;
  }
  return { deer, person };
}
