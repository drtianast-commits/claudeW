const pptxgen = require("pptxgenjs");
const React = require("react");
const RDS = require("react-dom/server");
const sharp = require("sharp");
const fa = require("react-icons/fa");
const path = require("path");
const { applyTheme } = require("/root/.claude/skills/synced/a916a458-ef74-4fe8-9a38-47e6cfc9862f_0081e073-369d-475e-8f17-be14e706f6b7/pptx/scripts/apply_theme.js");

const M = (f) => path.join(__dirname, "..", "media", f);
const OUT = path.join(__dirname, "..", "PO-002_Sistema_de_Ar_Mandado_Passo_a_Passo.pptx");

const THEME = {
  name: "Ar Mandado",
  headFontFace: "Arial",
  bodyFontFace: "Calibri",
  colors: {
    dk1: "1E252B", lt1: "FFFFFF", dk2: "26323C", lt2: "EEF1F4",
    accent1: "F2B705", accent2: "C8102E", accent3: "1F7A8C", accent4: "5B6770",
    accent5: "2E8B57", accent6: "E87722", hlink: "1F7A8C", folHlink: "5B6770",
  },
};
const HEX = THEME.colors;

async function icon(name, color, size = 256) {
  const svg = RDS.renderToStaticMarkup(React.createElement(fa[name], { color: "#" + color, size }));
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}

(async () => {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.title = "Sistema de Ar Mandado: passo a passo";
  pres.subject = "PO-002 Sistema de Ar Mandado, Rev. 06";
  pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
  const C = pres.SchemeColor;

  const footer = { text: "PO-002 Sistema de Ar Mandado | Rev. 06 | Roman Vedações", options: { x: 0.5, y: 5.2, w: 7, h: 0.3, fontSize: 9, color: C.accent4, margin: 0 } };

  pres.defineSlideMaster({
    title: "CAPA",
    background: { color: C.text1 },
    objects: [
      { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 1.55, w: 5.2, h: 1.3, fontSize: 40, bold: true, color: C.background1, fontFace: "Arial", valign: "bottom", margin: 0 }, text: "" } },
      { placeholder: { options: { name: "body", type: "body", x: 0.6, y: 3.0, w: 5.2, h: 0.9, fontSize: 18, color: C.accent1, valign: "top", margin: 0 }, text: "" } },
    ],
  });
  pres.defineSlideMaster({
    title: "CONTEUDO",
    background: { color: C.background1 },
    objects: [
      { placeholder: { options: { name: "title", type: "title", x: 1.25, y: 0.35, w: 8.25, h: 0.6, fontSize: 26, bold: true, color: C.text2, fontFace: "Arial", valign: "middle", align: "left", margin: 0 }, text: "" } },
      { text: footer },
    ],
    slideNumber: { x: 9.0, y: 5.2, w: 0.5, h: 0.3, fontSize: 9, color: C.accent4, align: "right" },
  });
  pres.defineSlideMaster({
    title: "ESCURO",
    background: { color: C.text1 },
    objects: [
      { placeholder: { options: { name: "title", type: "title", x: 1.25, y: 0.35, w: 8.25, h: 0.6, fontSize: 26, bold: true, color: C.background1, fontFace: "Arial", valign: "middle", align: "left", margin: 0 }, text: "" } },
      { text: { text: footer.text, options: { ...footer.options, color: "AAB4BD" } } },
    ],
    slideNumber: { x: 9.0, y: 5.2, w: 0.5, h: 0.3, fontSize: 9, color: "AAB4BD", align: "right" },
  });

  const sh = () => ({ type: "outer", color: "000000", opacity: 0.12, blur: 6, offset: 2, angle: 90 });

  function badge(s, label, fill = C.accent1, txt = C.text1) {
    s.addShape(pres.shapes.OVAL, { x: 0.5, y: 0.35, w: 0.6, h: 0.6, fill: { color: fill }, line: { type: "none" }, objectName: "Selo da etapa" });
    s.addText(label, { x: 0.5, y: 0.35, w: 0.6, h: 0.6, fontSize: 20, bold: true, color: txt, align: "center", valign: "middle", margin: 0, isTextBox: true, fontFace: "Arial" });
  }
  function slide(master, section, title, lbl, fill, txt) {
    const s = pres.addSlide({ masterName: master, sectionTitle: section });
    s.addText(title, { placeholder: "title" });
    if (lbl) badge(s, lbl, fill, txt);
    return s;
  }
  function card(s, x, y, w, h, fill = C.background2) {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.08, fill: { color: fill }, line: { type: "none" }, objectName: "Cartão" });
  }
  function numList(s, items, x, y, w, rowH, startN = 1, numFill = C.accent1, size = 14) {
    items.forEach((t, i) => {
      const yy = y + i * rowH;
      s.addShape(pres.shapes.OVAL, { x, y: yy + (rowH - 0.36) / 2, w: 0.36, h: 0.36, fill: { color: numFill }, line: { type: "none" } });
      s.addText(String(startN + i), { x, y: yy + (rowH - 0.36) / 2, w: 0.36, h: 0.36, fontSize: 12, bold: true, color: C.text1, align: "center", valign: "middle", margin: 0, isTextBox: true });
      s.addText(t, { x: x + 0.5, y: yy, w: w - 0.5, h: rowH, fontSize: size, color: C.text1, valign: "middle", margin: 0, isTextBox: true });
    });
  }
  function bullets(s, items, x, y, w, h, size = 14) {
    s.addText(items.map((t, i) => ({ text: t, options: { bullet: { indent: 14 }, breakLine: i < items.length - 1, paraSpaceAfter: 6 } })),
      { x, y, w, h, fontSize: size, color: C.text1, valign: "top", margin: 0, isTextBox: true });
  }
  async function iconCircle(s, name, x, y, d, fill, color) {
    s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: fill }, line: { type: "none" } });
    const p = d * 0.25;
    s.addImage({ data: await icon(name, color), x: x + p, y: y + p, w: d - 2 * p, h: d - 2 * p, altText: name });
  }

  // 1. CAPA
  pres.addSection({ title: "Abertura" });
  let s = pres.addSlide({ masterName: "CAPA", sectionTitle: "Abertura" });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y: 0.45, w: 1.7, h: 0.82, rectRadius: 0.06, fill: { color: C.background1 }, line: { type: "none" } });
  s.addImage({ path: M("image12.png"), x: 0.7, y: 0.5, w: 1.5, h: 0.72, altText: "Logotipo Roman Vedações" });
  s.addText("Sistema de Ar Mandado", { placeholder: "title" });
  s.addText("Passo a passo: do preparo do sistema à utilização da Maleta Purificadora de Ar Respirável XPAR 1000", { placeholder: "body" });
  s.addText("Baseado no procedimento PO-002, Revisão 06 (11/11/2025)", { x: 0.6, y: 4.45, w: 5.2, h: 0.3, fontSize: 12, color: "AAB4BD", margin: 0, isTextBox: true });
  s.addImage({ path: M("image1.jpeg"), x: 6.1, y: 1.0, w: 3.4, h: 3.4 * 457 / 605, altText: "Maleta XPAR 1000 fechada" });
  s.addNotes("Apresentação do passo a passo do PO-002: preparo, partida do compressor, maleta XPAR 1000, mangueiras, máscaras, monitoramento e emergência.");

  // 2. ROTEIRO
  s = slide("CONTEUDO", "Abertura", "Roteiro: 8 etapas do preparo à utilização");
  await iconCircle(s, "FaRoute" in fa ? "FaRoute" : "FaFlag", 0.5, 0.35, 0.6, C.accent1, HEX.dk1);
  const steps = [
    ["Capacitação e liberação", "Treinamento, APR, PT, DDS e liberadores"],
    ["Posicionamento", "Carretinha, vento, calços e isolamento"],
    ["Inspeção e pré-uso", "Checklist do compressor antes de ligar"],
    ["Partida do compressor", "Dreno, afogador, ignição, 175 psi"],
    ["Maleta XPAR 1000", "Filtros, detector e parâmetros Grau D"],
    ["Mangueiras e máscaras", "ERS, travas, 90 m e vedação facial"],
    ["Operação monitorada", "Vigia, rádio Ex e critérios de parada"],
    ["Emergência", "Parar, kit autônomo e evacuação"],
  ];
  steps.forEach(([t, d], i) => {
    const col = i % 4, row = Math.floor(i / 4);
    const x = 0.5 + col * 2.3, y = 1.2 + row * 1.95;
    card(s, x, y, 2.05, 1.8);
    s.addShape(pres.shapes.OVAL, { x: x + 0.2, y: y + 0.2, w: 0.45, h: 0.45, fill: { color: i === 7 ? C.accent2 : C.accent1 }, line: { type: "none" } });
    s.addText(String(i + 1), { x: x + 0.2, y: y + 0.2, w: 0.45, h: 0.45, fontSize: 14, bold: true, color: i === 7 ? C.background1 : C.text1, align: "center", valign: "middle", margin: 0, isTextBox: true });
    s.addText(t, { x: x + 0.2, y: y + 0.72, w: 1.7, h: 0.5, fontSize: 13, bold: true, color: C.text2, margin: 0, valign: "top", isTextBox: true });
    s.addText(d, { x: x + 0.2, y: y + 1.25, w: 1.7, h: 0.48, fontSize: 10.5, color: C.accent4, margin: 0, valign: "top", isTextBox: true });
  });
  s.addNotes("Visão geral. Cada etapa só começa quando a anterior estiver concluída e registrada.");

  // 3. ETAPA 1
  pres.addSection({ title: "Preparo" });
  s = slide("CONTEUDO", "Preparo", "Capacitação, documentação e liberação", "1");
  card(s, 0.5, 1.25, 4.9, 3.75);
  s.addText("Antes de iniciar", { x: 0.75, y: 1.4, w: 4.4, h: 0.4, fontSize: 16, bold: true, color: C.text2, margin: 0, isTextBox: true });
  bullets(s, [
    "Treinamento \"Gases e seus riscos\" (DC-21, Anexo 12)",
    "APR e PT (quando necessária) com todos treinados; DDS registrado em formulário",
    "Atividade fora da APR: paralisar e complementar",
    "Tarefa CR: liberação por gerente Gerdau da área, líder do terceiro e SST Gerdau",
    "EPIs básicos e da área; proibido uso de adornos",
  ], 0.75, 1.9, 4.45, 3.0, 13);
  s.addText("Detector de gás individual (calibrado, com pré-uso)", { x: 5.7, y: 1.25, w: 3.8, h: 0.4, fontSize: 14, bold: true, color: C.text2, margin: 0, isTextBox: true });
  [["O₂", "19,5 a 23,5 %"], ["H₂S", "8 ppm"], ["CO", "39 ppm"], ["LEL", "≤ 10 %"]].forEach(([g, v], i) => {
    const x = 5.7 + (i % 2) * 1.95, y = 1.75 + Math.floor(i / 2) * 1.05;
    card(s, x, y, 1.8, 0.9, C.text2);
    s.addText(v, { x: x + 0.12, y: y + 0.08, w: 1.56, h: 0.5, fontSize: 18, bold: true, color: C.accent1, margin: 0, valign: "middle", isTextBox: true });
    s.addText(g, { x: x + 0.12, y: y + 0.56, w: 1.56, h: 0.28, fontSize: 11, color: C.background1, margin: 0, isTextBox: true });
  });
  card(s, 5.7, 3.95, 3.75, 1.05, "FFF4CC");
  s.addText("Aproximar-se do vazamento somente com máscara conectada ao ar mandado, portando kit de respiração autônoma e rádio intrinsecamente seguro (Ex).",
    { x: 5.85, y: 4.0, w: 3.5, h: 0.95, fontSize: 11, color: C.text1, margin: 0, valign: "middle", isTextBox: true });
  s.addNotes("Itens 5, 11 e 12 do PO-002. Limites do detector conforme DC-21 Anexo 12.");

  // 4. RISCOS
  s = slide("CONTEUDO", "Preparo", "Riscos inerentes à atividade (DDS)");
  await iconCircle(s, "FaExclamationTriangle", 0.5, 0.35, 0.6, C.accent2, "FFFFFF");
  const riscos = [
    ["FaHandPaper", "Prensamento, esmagamento e perfuração de membros"],
    ["FaWalking", "Queda de mesmo nível ou de nível diferente"],
    ["FaCarCrash", "Atropelamento"],
    ["FaUserInjured", "Batida contra"],
    ["FaVolumeUp", "Ruído"],
    ["FaChair", "Ergonômico"],
    ["FaSmog", "Poeira"],
    ["FaHeadSideMask", "Intoxicação e asfixia"],
    ["FaBolt", "Chicoteamento da mangueira ao desplugar o conector"],
  ];
  for (let i = 0; i < riscos.length; i++) {
    const [ic, t] = riscos[i];
    const col = i % 3, row = Math.floor(i / 3);
    const x = 0.5 + col * 3.05, y = 1.25 + row * 1.25;
    card(s, x, y, 2.85, 1.05);
    await iconCircle(s, ic, x + 0.18, y + 0.25, 0.55, i >= 7 ? C.accent2 : C.text2, "FFFFFF");
    s.addText(t, { x: x + 0.9, y: y + 0.1, w: 1.85, h: 0.85, fontSize: 13, color: C.text1, margin: 0, valign: "middle", isTextBox: true });
  }
  s.addNotes("Item 8.2 do PO-002. Abordar todos no DDS antes da atividade.");

  // 5. ETAPA 2
  s = slide("CONTEUDO", "Preparo", "Posicionamento da carretinha com compressor", "2");
  numList(s, [
    "Avaliar o solo e posicionar a carreta em ponto com visão do local da atividade",
    "Verificar a direção do vento pela biruta",
    "Manter distância segura do ponto de vazamento",
    "Prender e ajustar os pés; colocar dois calços na mesma roda",
    "Isolar e sinalizar o local da atividade e as carretinhas",
  ], 0.5, 1.3, 5.0, 0.72);
  s.addImage({ path: M("image6.jpeg"), x: 5.9, y: 1.35, w: 3.6, h: 3.6 * 372 / 626, altText: "Compressor a diesel" });
  s.addText("Compressor a diesel do sistema", { x: 5.9, y: 1.4 + 3.6 * 372 / 626, w: 3.6, h: 0.3, fontSize: 10, color: C.accent4, margin: 0, isTextBox: true });
  s.addNotes("Item 6 do PO-002.");

  // 6. ETAPA 3
  s = slide("CONTEUDO", "Preparo", "Inspeção e pré-uso do compressor", "3");
  card(s, 0.5, 1.25, 4.3, 3.75);
  s.addText("Antes de ligar (8.3)", { x: 0.75, y: 1.4, w: 3.8, h: 0.4, fontSize: 16, bold: true, color: C.text2, margin: 0, isTextBox: true });
  bullets(s, [
    "Preencher o formulário de pré-uso",
    "Conferir nível de óleo diesel",
    "Conferir óleo do motor dos dois lados",
    "Bateria com cabos conectados e sem desgaste",
    "Inspeção visual: compressor, correias, parafusos e porcas",
    "Anormalidade encontrada: corrigir antes de operar",
  ], 0.75, 1.9, 3.9, 3.0, 13);
  s.addText("Checklist do pré-uso (8.4)", { x: 5.1, y: 1.25, w: 4.4, h: 0.4, fontSize: 16, bold: true, color: C.text2, margin: 0, isTextBox: true });
  const chk = ["Nível de combustível", "Chave de partida", "Manômetro", "Engate rápido do aparelho", "Filtros de ar", "Correia",
    "Limpeza e higienização", "Alimentação elétrica", "Engates das mangueiras", "Válvula de alívio (dreno)", "Nível do óleo", "Bateria e cabos"];
  const ok = await icon("FaCheckCircle" in fa ? "FaCheckCircle" : "FaClipboardCheck", HEX.accent5);
  chk.forEach((t, i) => {
    const x = 5.1 + (i % 2) * 2.2, y = 1.75 + Math.floor(i / 2) * 0.54;
    s.addImage({ data: ok, x, y: y + 0.09, w: 0.26, h: 0.26, altText: "Verificado" });
    s.addText(t, { x: x + 0.36, y, w: 1.8, h: 0.44, fontSize: 12, color: C.text1, margin: 0, valign: "middle", isTextBox: true });
  });
  s.addNotes("Itens 8.3 e 8.4 do PO-002.");

  // 7. ETAPA 4
  pres.addSection({ title: "Compressor" });
  s = slide("CONTEUDO", "Compressor", "Partida e funcionamento do compressor", "4");
  numList(s, [
    "Abrir a válvula de alívio e o dreno do vaso",
    "Acionar o afogador",
    "Posicionar a aceleração no meio e travar",
    "Acionar a chave de ignição (partida)",
    "Funcionando: ajustar aceleração para lenta",
  ], 0.5, 1.25, 4.4, 0.62, 1, C.accent1, 13);
  numList(s, [
    "Manter válvula e dreno abertos por alguns minutos (limpeza do vaso)",
    "Fechar válvula e dreno para encher o vaso",
    "Vaso a 175 psi (12,065 bar): pronto para uso",
    "Manter rotação baixa para demanda contínua de ar",
  ], 5.1, 1.25, 4.4, 0.62, 6, C.accent1, 13);
  card(s, 5.1, 3.95, 4.4, 1.0, C.text2);
  s.addText([{ text: "175 psi = 12,065 bar", options: { bold: true, color: C.accent1, fontSize: 18, breakLine: true } },
    { text: "Pressão de vaso cheio do Compressor 01 (azul)", options: { color: C.background1, fontSize: 11 } }],
    { x: 5.3, y: 4.0, w: 4.1, h: 0.9, margin: 0, valign: "middle", isTextBox: true });
  s.addNotes("Item 8.5 do PO-002.");

  // 8. AUTONOMIA
  s = slide("CONTEUDO", "Compressor", "Autonomia do vaso por número de executantes", "4");
  s.addChart(pres.charts.BAR, [
    { name: "Vaso a 175 psi (12,065 bar)", labels: ["1", "2", "3", "4"], values: [14.4, 7.2, 4.8, 3.6] },
    { name: "Vaso a 100 psi (6,9 bar)", labels: ["1", "2", "3", "4"], values: [8.2, 4.1, 2.7, 2.1] },
  ], {
    x: 0.5, y: 1.2, w: 5.3, h: 3.85, barDir: "col", barGrouping: "clustered",
    chartColors: [HEX.accent3, HEX.accent1], showValue: true, dataLabelPosition: "outEnd", dataLabelFontSize: 10, dataLabelColor: HEX.dk1,
    dataLabelFormatCode: "0.0", showLegend: true, legendPos: "b", legendFontSize: 10, legendFontFace: "+mn-lt",
    showTitle: true, title: "Compressor 01: duração (min) x executantes", titleFontSize: 12, titleColor: HEX.dk2, titleFontFace: "+mn-lt",
    catAxisLabelColor: HEX.accent4, valAxisLabelColor: HEX.accent4, catAxisLabelFontFace: "+mn-lt", valAxisLabelFontFace: "+mn-lt",
    catAxisLabelFontSize: 10, valAxisLabelFontSize: 10, valGridLine: { color: "E2E6EA", size: 0.5 }, catGridLine: { style: "none" },
    showCatAxisTitle: true, catAxisTitle: "Executantes", catAxisTitleFontSize: 10, catAxisTitleColor: HEX.accent4, valAxisMaxVal: 16,
  });
  card(s, 6.1, 1.25, 3.4, 1.15);
  s.addText([{ text: "100 L/min por executante", options: { bold: true, fontSize: 15, color: C.text2, breakLine: true } },
    { text: "Consumo de referência em esforço intenso (0,84 bar/min)", options: { fontSize: 11, color: C.accent4 } }],
    { x: 6.3, y: 1.3, w: 3.1, h: 1.05, margin: 0, valign: "middle", isTextBox: true });
  card(s, 6.1, 2.55, 3.4, 1.35, "FFF4CC");
  s.addText([{ text: "Regra obrigatória", options: { bold: true, fontSize: 14, color: C.accent2, breakLine: true } },
    { text: "Se o compressor for desligado, religar a partir de 100 psi (6,9 bar no Compressor 01; 7 bar no 02), com vigia monitorando sempre.", options: { fontSize: 11, color: C.text1 } }],
    { x: 6.3, y: 2.6, w: 3.1, h: 1.25, margin: 0, valign: "middle", isTextBox: true });
  s.addText("Compressor 02 (vermelho, 12,11 bar): valores praticamente iguais, 14,4 min com 1 executante e 3,6 min com 4. Dados das tabelas do item 8.6 do PO-002.",
    { x: 6.1, y: 4.05, w: 3.4, h: 0.95, fontSize: 10, color: C.accent4, margin: 0, valign: "top", isTextBox: true });
  s.addNotes("Tabelas do item 8.6. A duração indica o tempo do vaso sem reposição do compressor; por isso o compressor deve permanecer funcionando.");

  // 9. ETAPA 5 MALETA
  pres.addSection({ title: "Maleta XPAR 1000" });
  s = slide("CONTEUDO", "Maleta XPAR 1000", "Maleta XPAR 1000: filtros e detector", "5");
  s.addImage({ path: M("image2.jpeg"), x: 0.5, y: 1.25, w: 3.9, h: 3.9 * 465 / 543, altText: "Maleta XPAR 1000 aberta com filtros e detector" });
  const comp = [
    ["FaFilter", "Filtro 1: separador de condensado", "Remove excesso de água, óleo e particulado"],
    ["FaFilter", "Filtro 2: microfiltragem", "Particulado até 0,01 µm e óleo residual até 0,01 ppm"],
    ["FaFilter", "Filtro 3: catalítico", "Elimina o monóxido de carbono (CO)"],
    ["FaTachometerAlt", "Detector multigases", "CO, O₂, CO₂, VOC, H₂S, CH₄ e NH₃"],
  ];
  for (let i = 0; i < comp.length; i++) {
    const [ic, t, d] = comp[i];
    const y = 1.2 + i * 0.86;
    await iconCircle(s, ic, 4.75, y + 0.1, 0.55, i === 3 ? C.accent3 : C.text2, "FFFFFF");
    s.addText([{ text: t, options: { bold: true, fontSize: 14, color: C.text2, breakLine: true } }, { text: d, options: { fontSize: 12, color: C.accent4 } }],
      { x: 5.45, y, w: 4.05, h: 0.8, margin: 0, valign: "middle", isTextBox: true });
  }
  s.addText("4 saídas com engate rápido para máscaras de pressão positiva; bateria interna 12 V e extensão elétrica (Steck) de reserva.",
    { x: 4.75, y: 4.72, w: 4.75, h: 0.4, fontSize: 10, color: C.accent4, margin: 0, isTextBox: true });
  s.addNotes("Itens 7 e 7.2 do PO-002.");

  // 10. PARAMETROS
  s = slide("CONTEUDO", "Maleta XPAR 1000", "Parâmetros do ar respirável Grau D", "5");
  [["O₂", "19,5 a 23,5 %", "Faixa em volume"], ["CO", "< 10 ppm", "Concentração máxima"], ["CO₂", "< 1000 ppm", "Concentração máxima"], ["Óleo", "< 5 mg/m³", "Concentração máxima"]]
    .forEach(([g, v, d], i) => {
      const x = 0.5 + i * 2.3;
      card(s, x, 1.25, 2.1, 1.5, C.text2);
      s.addText(g, { x: x + 0.15, y: 1.35, w: 1.8, h: 0.3, fontSize: 12, bold: true, color: C.background1, margin: 0, isTextBox: true });
      s.addText(v, { x: x + 0.15, y: 1.68, w: 1.8, h: 0.6, fontSize: 22, bold: true, color: C.accent1, margin: 0, valign: "middle", isTextBox: true });
      s.addText(d, { x: x + 0.15, y: 2.33, w: 1.8, h: 0.3, fontSize: 10, color: "C9D1D8", margin: 0, isTextBox: true });
    });
  s.addText("Referência: ABNT NBR 12543. Odor: isento.   Ponto de orvalho: 10 °C abaixo da menor temperatura esperada.",
    { x: 0.5, y: 2.85, w: 9, h: 0.35, fontSize: 12, color: C.text1, margin: 0, isTextBox: true });
  [["2 bar", "Pressão mínima de trabalho por usuário"], ["10 bar", "Pressão máxima de trabalho"], ["Não alterar", "Regulador do detector vem pré-ajustado: fluxo errado distorce a leitura"]]
    .forEach(([v, d], i) => {
      const x = 0.5 + i * 3.07;
      card(s, x, 3.4, 2.87, 1.55);
      s.addText(v, { x: x + 0.2, y: 3.5, w: 2.5, h: 0.55, fontSize: 22, bold: true, color: i === 2 ? C.accent2 : C.accent3, margin: 0, valign: "middle", isTextBox: true });
      s.addText(d, { x: x + 0.2, y: 4.1, w: 2.5, h: 0.75, fontSize: 12, color: C.text1, margin: 0, valign: "top", isTextBox: true });
    });
  s.addNotes("Itens 7.1 e 7.3 do PO-002. Qualquer parâmetro fora da faixa: paralisar a atividade.");

  // 11. LIGAR MALETA
  s = slide("CONTEUDO", "Maleta XPAR 1000", "Ligar a maleta e conectar ao compressor", "5");
  numList(s, [
    "Fazer o pré-uso da maleta (bateria 12 V conferida com multímetro)",
    "Com o compressor funcionando, aguardar o manômetro em 175 psi",
    "Abrir os fechos, acionar o liga/desliga interno e fechar a maleta",
    "Aguardar a pré-leitura do display",
    "Conectar a mangueira de ar do compressor à maleta",
    "Autorizar o início só após concluir todas as verificações",
  ], 0.5, 1.25, 5.2, 0.62, 1, C.accent1, 13);
  s.addImage({ path: M("image4.png"), x: 6.0, y: 1.25, w: 3.5, h: 3.5 * 570 / 634, altText: "Sequência de conexão da XPAR 1000" });
  s.addNotes("Item 8.1 do PO-002. O texto do PO cita \"175bar\" no 8.1; o valor correto, coerente com o item 8.5, é 175 psi (12,065 bar).");

  // 12. MANGUEIRAS E MASCARAS
  pres.addSection({ title: "Utilização" });
  s = slide("CONTEUDO", "Utilização", "Mangueiras e máscara de pressão positiva", "6");
  numList(s, [
    "Mangueira azul atóxica com engate rápido de segurança (ERS)",
    "Conectar a mangueira do compressor ao engate da maleta",
    "Conferir encaixes e instalar as travas anti-chicoteamento (cabo de aço)",
    "Estender até o local sem dobras nem interferências; lance máximo de 90 m (Fundacentro)",
    "Fazer o pré-uso da máscara: vedação e ajuste ao rosto",
    "Engatar a máscara e confirmar ar suficiente e de boa qualidade",
  ], 0.5, 1.25, 5.4, 0.62, 1, C.accent1, 13);
  s.addImage({ path: M("image8.jpeg"), x: 6.2, y: 1.25, w: 3.3, h: 3.3 * 429 / 825, altText: "Mangueira azul atóxica" });
  s.addImage({ path: M("image9.jpeg"), x: 6.2, y: 3.15, w: 1.9 * 700 / 565 > 3.3 ? 3.3 : 1.9 * 700 / 565, h: 1.9, altText: "Máscara facial de pressão positiva" });
  s.addNotes("Itens 8.7 e 10 do PO-002.");

  // 13. OPERAÇÃO
  s = slide("CONTEUDO", "Utilização", "Operação monitorada e liberação", "7");
  bullets(s, [
    "Vigia dedicado monitora continuamente a maleta, o compressor e a captação de ar",
    "Comunicação constante via rádio intrinsecamente seguro (Ex)",
    "Ajustar a vazão conforme a demanda da equipe",
    "Pane ou parâmetro fora do limite: paralisar e emitir Recusa à Tarefa",
    "Todos portam kit de respiração autônoma para fuga",
    "Sem vazamento no carboxímetro: ar mandado não é obrigatório",
  ], 0.5, 1.3, 5.2, 3.7, 14);
  s.addImage({ path: M("sign.png"), x: 6.0, y: 1.3, w: 3.5, h: 3.5 * 270 / 610, altText: "Placa de identificação da linha de ar respirável" });
  s.addText("Placa da linha de ar respirável", { x: 6.0, y: 1.3 + 3.5 * 270 / 610 + 0.05, w: 3.5, h: 0.25, fontSize: 10, color: C.accent4, margin: 0, isTextBox: true });
  s.addImage({ path: M("image11.png"), x: 6.0, y: 3.2, w: 1.55 * 303 / 356, h: 1.55, altText: "Selo de liberação" });
  s.addText("Selo de liberação do equipamento (item 15)", { x: 7.45, y: 3.2, w: 2.05, h: 1.55, fontSize: 11, color: C.accent4, margin: 0, valign: "middle", isTextBox: true });
  s.addNotes("Itens 8.7, 12, 14 e 15 do PO-002.");

  // 14. EMERGENCIA
  pres.addSection({ title: "Emergência" });
  s = slide("ESCURO", "Emergência", "Plano de emergência", "8", C.accent2, C.background1);
  const em = [["FaStopCircle", "Parar", "Qualquer falha no equipamento: parar a atividade até solucionar"],
    ["FaHeadSideMask", "Proteger", "Usar o kit de respiração autônoma (cilindro com máscara)"],
    ["FaRunning", "Evacuar", "Ir ao ponto de encontro mais próximo, guiado pela biruta, perpendicular ao vento"]];
  for (let i = 0; i < em.length; i++) {
    const [ic, t, d] = em[i];
    const x = 0.5 + i * 3.07;
    card(s, x, 1.4, 2.87, 3.4, C.text2);
    await iconCircle(s, ic, x + 0.25, 1.65, 0.8, i === 0 ? C.accent2 : C.accent1, i === 0 ? "FFFFFF" : HEX.dk1);
    s.addText(t, { x: x + 0.25, y: 2.65, w: 2.4, h: 0.5, fontSize: 22, bold: true, color: C.background1, margin: 0, isTextBox: true });
    s.addText(d, { x: x + 0.25, y: 3.2, w: 2.4, h: 1.45, fontSize: 14, color: "D5DCE2", margin: 0, valign: "top", isTextBox: true });
  }
  s.addNotes("Item 13 do PO-002.");

  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log("ok", OUT);
})().catch((e) => { console.error(e); process.exit(1); });
