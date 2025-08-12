import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

// Suas CREDENCIAIS DO FIREBASE
// COPIE e COLE o objeto firebaseConfig do seu Console do Firebase AQUI.
// Ex:
// const firebaseConfig = {
//   apiKey: "AIzaSy...",
//   authDomain: "seu-projeto.firebaseapp.com",
//   projectId: "seu-projeto-id",
//   storageBucket: "seu-projeto.appspot.com",
//   messagingSenderId: "...",
//   appId: "1:...",
//   measurementId: "G-..." // Opcional
// };
// Se você não tiver um projeto Firebase, crie um em console.firebase.google.com
const firebaseConfig = {
  apiKey: "SUA_API_KEY_AQUI", // <-- Insira sua chave de API aqui
  authDomain: "SEU_AUTH_DOMAIN_AQUI", // <-- Insira seu domínio de autenticação aqui
  projectId: "SEU_PROJECT_ID_AQUI", // <-- Insira o ID do seu projeto aqui (este será o appId para o Firestore)
  storageBucket: "SEU_STORAGE_BUCKET_AQUI", // <-- Insira seu bucket de armazenamento aqui
  messagingSenderId: "SEU_MESSAGING_SENDER_ID_AQUI", // <-- Insira seu ID de remetente de mensagens aqui
  appId: "SEU_APP_ID_AQUI", // <-- Insira seu ID de aplicativo aqui
  // measurementId: "SEU_MEASUREMENT_ID_AQUI" // Opcional
};

// Use o projectId da sua configuração como appId para o Firestore
const appId = firebaseConfig.projectId;

// initialAuthToken é específico do ambiente Canvas, defina como null para outros ambientes.
const initialAuthToken = null;

// Fator de conversão: metros cúbicos de madeira por árvore.
// Este é um valor simplificado e pode variar muito na realidade.
const CUBIC_METERS_PER_TREE = 0.5; // Exemplo: 1 árvore rende 0.5 metros cúbicos de madeira.

// Lista de materiais com suas propriedades
// densities in kg/m³, co2Factor in kg CO2e per kg of material (simplified estimates)
const materials = [
    // Metais
    { name: 'Aço Carbono', density: 7850, formType: 'block', formula: 'Fe-C Liga', co2Factor: 2.0, image: 'https://placehold.co/150x150/b0b0b0/ffffff?text=Aço+Carbono' },
    { name: 'Aço Inox', density: 8000, formType: 'block', formula: 'Fe-Cr-Ni Liga', co2Factor: 3.5, image: 'https://placehold.co/150x150/c0c0c0/ffffff?text=Aço+Inox' },
    { name: 'Alumínio', density: 2700, formType: 'block', formula: 'Al', co2Factor: 10.0, image: 'https://placehold.co/150x150/d0d0d0/ffffff?text=Alumínio' },
    { name: 'Cobre', density: 8960, formType: 'block', formula: 'Cu', co2Factor: 2.5, image: 'https://placehold.co/150x150/daa520/ffffff?text=Cobre' },
    { name: 'Latão', density: 8500, formType: 'block', formula: 'Cu-Zn Liga', co2Factor: 2.8, image: 'https://placehold.co/150x150/cd7f32/ffffff?text=Latão' },
    { name: 'Bronze', density: 8800, formType: 'block', formula: 'Cu-Sn Liga', co2Factor: 3.0, image: 'https://placehold.co/150x150/b87333/ffffff?text=Bronze' },
    { name: 'Chumbo', density: 11340, formType: 'block', formula: 'Pb', co2Factor: 1.5, image: 'https://placehold.co/150x150/505050/ffffff?text=Chumbo' },
    { name: 'Zinco', density: 7130, formType: 'block', formula: 'Zn', co2Factor: 2.2, image: 'https://placehold.co/150x150/708090/ffffff?text=Zinco' },
    { name: 'Titânio', density: 4500, formType: 'block', formula: 'Ti', co2Factor: 15.0, image: 'https://placehold.co/150x150/6a5acd/ffffff?text=Titânio' },
    { name: 'Ferro Fundido', density: 7200, formType: 'block', formula: 'Fe-C Liga (Alto C)', co2Factor: 1.8, image: 'https://placehold.co/150x150/404040/ffffff?text=Ferro+Fundido' },
    { name: 'Níquel', density: 8900, formType: 'block', formula: 'Ni', co2Factor: 10.0, image: 'https://placehold.co/150x150/a9a9a9/ffffff?text=Níquel' },
    { name: 'Magnésio', density: 1740, formType: 'block', formula: 'Mg', co2Factor: 20.0, image: 'https://placehold.co/150x150/b0c4de/ffffff?text=Magnésio' },
    { name: 'Prata', density: 10490, formType: 'block', formula: 'Ag', co2Factor: 0.1, image: 'https://placehold.co/150x150/c0c0c0/000000?text=Prata' },
    { name: 'Ouro', density: 19300, formType: 'block', formula: 'Au', co2Factor: 0.05, image: 'https://placehold.co/150x150/ffd700/000000?text=Ouro' },
    { name: 'Cromo', density: 7190, formType: 'block', formula: 'Cr', co2Factor: 12.0, image: 'https://placehold.co/150x150/808080/ffffff?text=Cromo' },
    { name: 'Estanho', density: 7290, formType: 'block', formula: 'Sn', co2Factor: 2.0, image: 'https://placehold.co/150x150/d3d3d3/000000?text=Estanho' },

    // Madeiras
    { name: 'Pinus', density: 500, formType: 'block', formula: 'Celulose/Lignina', co2Factor: 0.5, isWood: true, image: 'https://placehold.co/150x150/8b4513/ffffff?text=Pinus' },
    { name: 'Eucalipto', density: 700, formType: 'block', formula: 'Celulose/Lignina', co2Factor: 0.6, isWood: true, image: 'https://placehold.co/150x150/a0522d/ffffff?text=Eucalipto' },
    { name: 'Carvalho', density: 750, formType: 'block', formula: 'Celulose/Lignina', co2Factor: 0.7, isWood: true, image: 'https://placehold.co/150x150/804000/ffffff?text=Carvalho' },
    { name: 'Mogno', density: 650, formType: 'block', formula: 'Celulose/Lignina', co2Factor: 0.8, isWood: true, image: 'https://placehold.co/150x150/5c3317/ffffff?text=Mogno' },
    { name: 'Cerejeira', density: 600, formType: 'block', formula: 'Celulose/Lignina', co2Factor: 0.75, isWood: true, image: 'https://placehold.co/150x150/d2691e/ffffff?text=Cerejeira' },
    { name: 'Nogueira', density: 680, formType: 'block', formula: 'Celulose/Lignina', co2Factor: 0.85, isWood: true, image: 'https://placehold.co/150x150/4a2c00/ffffff?text=Nogueira' },
    { name: 'Bambu', density: 600, formType: 'block', formula: 'Celulose/Hemicelulose', co2Factor: 0.4, isWood: true, image: 'https://placehold.co/150x150/7c9a42/ffffff?text=Bambu' },
    { name: 'Compensado', density: 600, formType: 'block', formula: 'Madeira Processada', co2Factor: 1.0, isWood: false, image: 'https://placehold.co/150x150/b08060/ffffff?text=Compensado' }, // Processed wood, not direct tree count
    { name: 'MDF', density: 700, formType: 'block', formula: 'Fibra de Madeira', co2Factor: 1.2, isWood: false, image: 'https://placehold.co/150x150/c09070/ffffff?text=MDF' }, // Processed wood
    { name: 'Aglomerado', density: 650, formType: 'block', formula: 'Partículas de Madeira', co2Factor: 1.1, isWood: false, image: 'https://placehold.co/150x150/d0a080/ffffff?text=Aglomerado' }, // Processed wood

    // Plásticos e Polímeros
    { name: 'Polietileno (PE)', density: 950, formType: 'block', formula: '(C2H4)n', co2Factor: 1.8, image: 'https://placehold.co/150x150/66cdaa/ffffff?text=PE' },
    { name: 'Polipropileno (PP)', density: 900, formType: 'block', formula: '(C3H6)n', co2Factor: 1.9, image: 'https://placehold.co/150x150/8fbc8f/ffffff?text=PP' },
    { name: 'PVC', density: 1400, formType: 'block', formula: '(C2H3Cl)n', co2Factor: 2.1, image: 'https://placehold.co/150x150/778899/ffffff?text=PVC' },
    { name: 'PET', density: 1380, formType: 'block', formula: '(C10H8O4)n', co2Factor: 2.5, image: 'https://placehold.co/150x150/add8e6/ffffff?text=PET' },
    { name: 'Acrílico (PMMA)', density: 1180, formType: 'block', formula: '(C5H8O2)n', co2Factor: 3.0, image: 'https://placehold.co/150x150/b0e0e6/ffffff?text=Acrílico' },
    { name: 'Nylon (PA)', density: 1150, formType: 'block', formula: 'Poliamida', co2Factor: 4.0, image: 'https://placehold.co/150x150/c0c0c0/ffffff?text=Nylon' },
    { name: 'ABS', density: 1040, formType: 'block', formula: 'C8H8·C4H6·C3H3N', co2Factor: 3.5, image: 'https://placehold.co/150x150/a9a9a9/ffffff?text=ABS' },
    { name: 'Policarbonato (PC)', density: 1200, formType: 'block', formula: 'Polímero Sintético', co2Factor: 5.0, image: 'https://placehold.co/150x150/87cefa/ffffff?text=Policarbonato' },
    { name: 'Poliuretano (PU)', density: 1250, formType: 'block', formula: 'Polímero Sintético', co2Factor: 3.2, image: 'https://placehold.co/150x150/8b0000/ffffff?text=Poliuretano' },
    { name: 'Teflon (PTFE)', density: 2200, formType: 'block', formula: '(C2F4)n', co2Factor: 10.0, image: 'https://placehold.co/150x150/ffffff/000000?text=Teflon' },
    { name: 'EPE (Espuma de PE)', density: null, formType: 'custom_density_block', formula: '(C2H4)n (Espuma)', co2Factor: 1.5, image: 'https://placehold.co/150x150/d3d3d3/ffffff?text=EPE' },
    { name: 'EVA', density: 100, formType: 'block', formula: '(C2H4)x(C4H6O2)y', co2Factor: 1.0, image: 'https://placehold.co/150x150/ffb6c1/ffffff?text=EVA' },
    { name: 'Poliestireno (PS)', density: 1050, formType: 'block', formula: '(C8H8)n', co2Factor: 2.0, image: 'https://placehold.co/150x150/d8bfd8/ffffff?text=Poliestireno' },

    // Outros
    { name: 'Vidro', density: 2500, formType: 'block', formula: 'SiO2 (Principal)', co2Factor: 0.8, image: 'https://placehold.co/150x150/87ceeb/ffffff?text=Vidro' },
    { name: 'Borracha Natural', density: 920, formType: 'block', formula: '(C5H8)n', co2Factor: 1.0, image: 'https://placehold.co/150x150/36454F/ffffff?text=Borracha' },
    { name: 'Borracha Sintética', density: 1200, formType: 'block', formula: 'Polímero Elástico', co2Factor: 1.5, image: 'https://placehold.co/150x150/46576d/ffffff?text=Borracha+Sintética' },
    { name: 'Concreto', density: 2400, formType: 'block', formula: 'Cimento+Agregados', co2Factor: 0.1, image: 'https://placehold.co/150x150/708090/ffffff?text=Concreto' },
    { name: 'Cerâmica', density: 2500, formType: 'block', formula: 'Óxidos Inorgânicos', co2Factor: 0.5, image: 'https://placehold.co/150x150/cd853f/ffffff?text=Cerâmica' },
    { name: 'Papelão', density: null, formType: 'custom_density_block', formula: 'Celulose', co2Factor: 0.3, image: 'https://placehold.co/150x150/b0c4de/ffffff?text=Papelão' },
    { name: 'Isopor (EPS)', density: 30, formType: 'block', formula: '(C8H8)n (Espuma)', co2Factor: 0.8, image: 'https://placehold.co/150x150/f0f8ff/000000?text=Isopor' },
    { name: 'Silicone', density: 1100, formType: 'block', formula: 'Polímero de Si-O', co2Factor: 1.0, image: 'https://placehold.co/150x150/add8e6/ffffff?text=Silicone' },
    { name: 'Gesso', density: 1100, formType: 'block', formula: 'CaSO4·2H2O', co2Factor: 0.2, image: 'https://placehold.co/150x150/f0f0f0/000000?text=Gesso' },
    { name: 'Mármore', density: 2700, formType: 'block', formula: 'CaCO3', co2Factor: 0.05, image: 'https://placehold.co/150x150/d3d3d3/000000?text=Mármore' },
    { name: 'Granito', density: 2750, formType: 'block', formula: 'Silicatos Diversos', co2Factor: 0.06, image: 'https://placehold.co/150x150/a9a9a9/000000?text=Granito' },
    { name: 'Areia', density: 1600, formType: 'block', formula: 'SiO2 (Principal)', co2Factor: 0.01, image: 'https://placehold.co/150x150/f4a460/ffffff?text=Areia' },
    { name: 'Água', density: 1000, formType: 'block', formula: 'H2O', co2Factor: 0.001, image: 'https://placehold.co/150x150/a0e6ff/000000?text=Água' },
    { name: 'Tubo Metálico (Genérico)', density: 7850, formType: 'tube', formula: 'Liga Metálica', co2Factor: 2.0, image: 'https://placehold.co/150x150/a9a9a9/ffffff?text=Tubo+Metálico' }, // Densidade padrão para tubo metálico (aço)
];

// Componente principal do aplicativo
function App() {
    // Estados para Firebase
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);

    // Estados para o aplicativo
    const [selectedMaterialName, setSelectedMaterialName] = useState('');
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    const [tubeShape, setTubeShape] = useState(''); // Estado para a forma do tubo (cilíndrico, retangular, quadrado)

    // Estados para dimensões de bloco/custom_density_block
    const [length, setLength] = useState('');
    const [width, setWidth] = useState('');
    const [height, setHeight] = useState('');

    // Estado para densidade personalizada (usada por EPE e Papelão)
    const [customDensity, setCustomDensity] = useState('');

    // Estados para dimensões de tubo cilíndrico
    const [outerDiameter, setOuterDiameter] = useState('');
    const [wallThicknessCylindrical, setWallThicknessCylindrical] = useState('');
    const [tubeLengthCylindrical, setTubeLengthCylindrical] = useState('');

    // Estados para dimensões de tubo retangular/quadrado
    const [outerDim1, setOuterDim1] = useState('');
    const [outerDim2, setOuterDim2] = useState(''); // outerDim2 agora será controlado para 'quadrado'
    const [wallThicknessRectangular, setWallThicknessRectangular] = useState('');
    const [tubeLengthRectangular, setTubeLengthRectangular] = useState('');

    const [unit, setUnit] = useState('mm'); // Unidade de medida padrão

    const [calculatedItemWeight, setCalculatedItemWeight] = useState(null); // Peso do item individual
    const [calculatedItemCO2e, setCalculatedItemCO2e] = useState(null); // CO2e do item individual
    const [calculatedItemVolume, setCalculatedItemVolume] = useState(null); // Volume do item individual
    const [calculatedItemTrees, setCalculatedItemTrees] = useState(null); // Árvores estimadas para o item individual

    const [addedMaterials, setAddedMaterials] = useState([]); // Lista de materiais adicionados para a soma
    const [totalWeight, setTotalWeight] = useState(null); // Peso total da embalagem
    const [totalCO2e, setTotalCO2e] = useState(null); // CO2e total da embalagem
    const [totalVolume, setTotalVolume] = useState(null); // Volume total da embalagem
    const [totalTrees, setTotalTrees] = useState(null); // Total de árvores para a embalagem

    const [weightUnit, setWeightUnit] = useState('kg'); // Unidade de peso padrão
    const [errorMessage, setErrorMessage] = useState('');

    // Efeito para inicializar o Firebase e autenticar
    useEffect(() => {
        // Verifica se a configuração do Firebase é válida
        if (!firebaseConfig || !firebaseConfig.projectId || !firebaseConfig.apiKey) {
            console.error("Firebase config is missing or incomplete. Please provide your actual Firebase project configuration.");
            setErrorMessage("Erro: Configuração do Firebase incompleta. Por favor, insira suas credenciais.");
            return;
        }

        const app = initializeApp(firebaseConfig);
        const authInstance = getAuth(app);
        const firestoreInstance = getFirestore(app);
        setAuth(authInstance);
        setDb(firestoreInstance);

        const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
            if (user) {
                setUserId(user.uid);
                setIsAuthReady(true);
            } else {
                // If no user, sign in anonymously or with custom token
                try {
                    // initialAuthToken é específico do ambiente Canvas, então tentamos autenticar anonimamente
                    await signInAnonymously(authInstance);
                } catch (error) {
                    console.error("Firebase Auth Error:", error);
                    // Fallback to a random ID if anonymous sign-in fails
                    setUserId(crypto.randomUUID()); // Gera um ID aleatório para usuários não autenticados
                    setIsAuthReady(true);
                }
            }
        });

        return () => unsubscribe();
    }, []);

    // Efeito para carregar as preferências do usuário do Firestore
    useEffect(() => {
        if (isAuthReady && db && userId) {
            loadPreferences();
        }
    }, [isAuthReady, db, userId]);

    // Efeito para atualizar o material selecionado e resetar campos
    useEffect(() => {
        const material = materials.find(m => m.name === selectedMaterialName);
        setSelectedMaterial(material);
        setCalculatedItemWeight(null);
        setCalculatedItemCO2e(null);
        setCalculatedItemVolume(null);
        setCalculatedItemTrees(null);
        setErrorMessage('');
        setCustomDensity(''); // Resetar densidade personalizada
        setTubeShape(''); // Resetar forma do tubo
        // Resetar todos os campos de dimensão ao mudar material
        setLength(''); setWidth(''); setHeight('');
        setOuterDiameter(''); setWallThicknessCylindrical(''); setTubeLengthCylindrical('');
        setOuterDim1(''); setOuterDim2(''); setWallThicknessRectangular(''); setTubeLengthRectangular('');

        // Se o material selecionado for do tipo 'tube', define a forma padrão como 'cilíndrico'
        if (material && material.formType === 'tube') {
            setTubeShape('cilindrico');
        }
    }, [selectedMaterialName]);

    // Função para carregar as preferências do usuário do Firestore
    const loadPreferences = async () => {
        if (!db || !userId) return;
        try {
            const docRef = doc(db, `artifacts/${appId}/users/${userId}/preferences`, "calculator_prefs");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.lastSelectedMaterialName) {
                    setSelectedMaterialName(data.lastSelectedMaterialName);
                }
            }
        } catch (error) {
            console.error("Erro ao carregar preferências:", error);
        }
    };

    // Função para salvar as preferências do usuário no Firestore
    const savePreferences = async (materialName) => {
        if (!db || !userId) return;
        try {
            const docRef = doc(db, `artifacts/${appId}/users/${userId}/preferences`, "calculator_prefs");
            await setDoc(docRef, { lastSelectedMaterialName: materialName }, { merge: true });
        } catch (error) {
            console.error("Erro ao salvar preferências:", error);
        }
    };

    // Lida com a mudança do material selecionado
    const handleMaterialChange = (e) => {
        const newMaterialName = e.target.value;
        setSelectedMaterialName(newMaterialName);
        savePreferences(newMaterialName); // Salva a preferência
    };

    // Função para converter unidades para metros (para cálculo de volume em m³)
    const convertToMeters = (value, currentUnit) => {
        switch (currentUnit) {
            case 'mm':
                return value / 1000;
            case 'cm':
                return value / 100;
            case 'm':
                return value;
            default:
                return value;
        }
    };

    // Função para converter peso para a unidade desejada (kg ou g)
    const convertWeight = (weightInKg, targetUnit) => {
        if (targetUnit === 'g') {
            return weightInKg * 1000;
        }
        return weightInKg;
    };

    // Função principal para calcular o peso de um único item
    const calculateSingleItemWeight = () => {
        setErrorMessage('');
        setCalculatedItemWeight(null);
        setCalculatedItemCO2e(null);
        setCalculatedItemVolume(null);
        setCalculatedItemTrees(null);

        if (!selectedMaterial) {
            setErrorMessage('Por favor, selecione um material.');
            return null; // Retorna null para indicar falha
        }

        let volume = 0;
        let densityToUse = selectedMaterial.density;
        let co2FactorToUse = selectedMaterial.co2Factor;
        let estimatedTrees = null;

        if (selectedMaterial.formType === 'block') {
            const l = parseFloat(length);
            const w = parseFloat(width);
            const h = parseFloat(height);

            if (isNaN(l) || isNaN(w) || isNaN(h) || l <= 0 || w <= 0 || h <= 0) {
                setErrorMessage('Para materiais em bloco, insira Comprimento, Largura e Altura válidos e positivos.');
                return null;
            }

            const lengthInM = convertToMeters(l, unit);
            const widthInM = convertToMeters(w, unit);
            const heightInM = convertToMeters(h, unit);

            volume = lengthInM * widthInM * heightInM;
        } else if (selectedMaterial.formType === 'custom_density_block') {
            const l = parseFloat(length);
            const w = parseFloat(width);
            const h = parseFloat(height);
            const d = parseFloat(customDensity); // Usar customDensity para EPE e Papelão

            if (isNaN(l) || isNaN(w) || isNaN(h) || l <= 0 || w <= 0 || h <= 0) {
                setErrorMessage('Para este material, insira Comprimento, Largura e Altura válidos e positivos.');
                return null;
            }
            if (isNaN(d) || d <= 0) {
                setErrorMessage('Para este material, por favor, insira uma densidade válida e positiva.');
                return null;
            }

            const lengthInM = convertToMeters(l, unit);
            const widthInM = convertToMeters(w, unit);
            const heightInM = convertToMeters(h, unit);

            volume = lengthInM * widthInM * heightInM;
            densityToUse = d;
        } else if (selectedMaterial.formType === 'tube') {
            if (!tubeShape) {
                setErrorMessage('Por favor, selecione a forma do tubo (Cilíndrico, Retangular ou Quadrado).');
                return null;
            }

            if (tubeShape === 'cilindrico') {
                const od = parseFloat(outerDiameter);
                const wt = parseFloat(wallThicknessCylindrical);
                const tl = parseFloat(tubeLengthCylindrical);

                if (isNaN(od) || isNaN(wt) || isNaN(tl) || od <= 0 || wt <= 0 || tl <= 0) {
                    setErrorMessage('Para tubo cilíndrico, insira Diâmetro Externo, Espessura da Parede e Comprimento válidos e positivos.');
                    return null;
                }
                if (wt * 2 >= od) {
                    setErrorMessage('A espessura da parede não pode ser maior ou igual ao diâmetro externo. Ajuste os valores.');
                    return null;
                }

                const outerDiameterInM = convertToMeters(od, unit);
                const wallThicknessInM = convertToMeters(wt, unit);
                const tubeLengthInM = convertToMeters(tl, unit);

                const outerRadius = outerDiameterInM / 2;
                const innerRadius = outerRadius - wallThicknessInM;

                volume = Math.PI * (Math.pow(outerRadius, 2) - Math.pow(innerRadius, 2)) * tubeLengthInM;
            } else if (tubeShape === 'retangular' || tubeShape === 'quadrado') {
                const od1 = parseFloat(outerDim1);
                // Para tubos quadrados, outerDim2 é o mesmo que outerDim1
                const od2Calculated = (tubeShape === 'quadrado') ? od1 : parseFloat(outerDim2);
                const wt = parseFloat(wallThicknessRectangular);
                const tl = parseFloat(tubeLengthRectangular);

                if (isNaN(od1) || isNaN(od2Calculated) || isNaN(wt) || isNaN(tl) || od1 <= 0 || od2Calculated <= 0 || wt <= 0 || tl <= 0) {
                    setErrorMessage('Para tubo retangular/quadrado, insira as Dimensões Externas, Espessura da Parede e Comprimento válidos e positivos.');
                    return null;
                }
                if (wt * 2 >= od1 || wt * 2 >= od2Calculated) {
                    setErrorMessage('A espessura da parede não pode ser maior ou igual à menor dimensão externa. Ajuste os valores.');
                    return null;
                }

                const outerDim1InM = convertToMeters(od1, unit);
                const outerDim2InM = convertToMeters(od2Calculated, unit); // Usar od2Calculated aqui
                const wallThicknessInM = convertToMeters(wt, unit);
                const tubeLengthInM = convertToMeters(tl, unit);

                const innerDim1 = outerDim1InM - (2 * wallThicknessInM);
                const innerDim2 = outerDim2InM - (2 * wallThicknessInM);

                if (innerDim1 <= 0 || innerDim2 <= 0) {
                    setErrorMessage('A espessura da parede é muito grande para as dimensões fornecidas. O tubo interno teria dimensão zero ou negativa.');
                    return null;
                }

                volume = (outerDim1InM * outerDim2InM - innerDim1 * innerDim2) * tubeLengthInM;
            }
        }

        if (volume <= 0) {
            setErrorMessage('O volume calculado é zero ou negativo. Verifique as dimensões inseridas.');
            return null;
        }

        const weightInKg = volume * densityToUse;
        const co2Equivalent = weightInKg * co2FactorToUse;

        // Calcular árvores apenas se for madeira natural
        if (selectedMaterial.isWood) {
            estimatedTrees = volume / CUBIC_METERS_PER_TREE;
        }

        setCalculatedItemWeight(convertWeight(weightInKg, weightUnit).toFixed(3));
        setCalculatedItemCO2e(co2Equivalent.toFixed(3));
        setCalculatedItemVolume(volume.toFixed(5)); // Volume em m³ com mais casas decimais
        setCalculatedItemTrees(estimatedTrees !== null ? estimatedTrees.toFixed(2) : null);


        return {
            id: Date.now(), // ID único para cada item adicionado
            material: selectedMaterial,
            // Salvar as dimensões usadas no cálculo
            dimensions: {
                length, width, height,
                outerDiameter, wallThicknessCylindrical, tubeLengthCylindrical,
                outerDim1, outerDim2: (tubeShape === 'quadrado') ? outerDim1 : outerDim2, // Salvar outerDim2 correto para quadrado
                wallThicknessRectangular, tubeLengthRectangular, tubeShape, unit, customDensity
            },
            weightKg: weightInKg,
            co2e: co2Equivalent,
            volumeM3: volume, // Adicionar volume ao item
            estimatedTrees: estimatedTrees, // Adicionar árvores ao item
            displayWeight: convertWeight(weightInKg, weightUnit).toFixed(3),
            displayCO2e: co2Equivalent.toFixed(3),
            displayVolume: volume.toFixed(5), // Volume formatado para exibição
            displayTrees: estimatedTrees !== null ? estimatedTrees.toFixed(2) : null,
            displayUnit: weightUnit,
        };
    };

    // Adiciona o item calculado à lista de materiais
    const handleAddItemToPackage = () => {
        const item = calculateSingleItemWeight();
        if (item) {
            setAddedMaterials([...addedMaterials, item]);
            // Resetar campos para a próxima entrada
            setSelectedMaterialName('');
            setLength(''); setWidth(''); setHeight('');
            setOuterDiameter(''); setWallThicknessCylindrical(''); setTubeLengthCylindrical('');
            setOuterDim1(''); setOuterDim2(''); // Resetar outerDim2
            setWallThicknessRectangular(''); setTubeLengthRectangular('');
            setCustomDensity(''); // Resetar densidade personalizada
            setTubeShape('');
            setCalculatedItemWeight(null);
            setCalculatedItemCO2e(null);
            setCalculatedItemVolume(null);
            setCalculatedItemTrees(null);
        }
    };

    // Remove um item da lista de materiais adicionados
    const handleRemoveItem = (id) => {
        setAddedMaterials(addedMaterials.filter(item => item.id !== id));
        setTotalWeight(null); // Resetar total ao remover item
        setTotalCO2e(null);
        setTotalVolume(null);
        setTotalTrees(null);
    };

    // Calcula o peso e CO2e totais da embalagem
    const calculateTotalPackage = () => {
        const totalW = addedMaterials.reduce((sum, item) => sum + item.weightKg, 0);
        const totalC = addedMaterials.reduce((sum, item) => sum + item.co2e, 0);
        const totalV = addedMaterials.reduce((sum, item) => sum + item.volumeM3, 0);
        const totalT = addedMaterials.reduce((sum, item) => sum + (item.estimatedTrees || 0), 0); // Soma apenas árvores de itens de madeira

        setTotalWeight(convertWeight(totalW, weightUnit).toFixed(3));
        setTotalCO2e(totalC.toFixed(3));
        setTotalVolume(totalV.toFixed(5));
        setTotalTrees(totalT.toFixed(2));
    };

    // Exibe o ID do usuário para fins de depuração e demonstração de multi-usuário
    const displayUserId = userId || 'Carregando ID...';

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-500 to-indigo-600 p-4 sm:p-8 flex items-center justify-center font-sans">
            <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-10 w-full max-w-lg md:max-w-3xl transform transition-all duration-300 hover:scale-105">
                <h1 className="text-4xl sm:text-5xl font-extrabold text-center text-gray-800 mb-8 drop-shadow-lg">
                    Cálculo de Peso de Materiais ⚖️
                </h1>
                <p className="text-sm text-gray-500 text-center mb-6 break-words">
                    Seu ID de Usuário: {displayUserId} (usado para salvar suas preferências de material)
                </p>

                {/* Seção de seleção de material e detalhes */}
                <div className="mb-8 flex flex-col sm:flex-row items-center justify-center gap-6">
                    <div className="flex-1 w-full">
                        <label htmlFor="material-select" className="block text-gray-700 text-lg font-semibold mb-2">
                            Selecione o Material:
                        </label>
                        <div className="relative">
                            <select
                                id="material-select"
                                className="w-full p-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 appearance-none bg-white"
                                value={selectedMaterialName}
                                onChange={handleMaterialChange}
                            >
                                <option value="">-- Escolha um material --</option>
                                {materials.map((material) => (
                                    <option key={material.name} value={material.name}>
                                        {material.name}
                                    </option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                    {selectedMaterial && (
                        <div className="mt-4 sm:mt-0 flex-shrink-0 text-center">
                            <img
                                src={selectedMaterial.image}
                                alt={selectedMaterial.name}
                                className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover shadow-md border-4 border-purple-300 mx-auto mb-2"
                            />
                            <p className="text-sm font-semibold text-gray-700">
                                Composição Química: <span className="text-blue-600">{selectedMaterial.formula}</span>
                            </p>
                            <p className="text-sm font-semibold text-gray-700">
                                Densidade: <span className="text-blue-600">{selectedMaterial.density !== null ? selectedMaterial.density + ' kg/m³' : 'A definir'}</span>
                            </p>
                        </div>
                    )}
                </div>

                {/* Unidade de Medida */}
                <div className="mb-8">
                    <label htmlFor="unit-select" className="block text-gray-700 text-lg font-semibold mb-2">
                        Unidade de Medida (para dimensões):
                    </label>
                    <div className="relative">
                        <select
                            id="unit-select"
                            className="w-full p-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 appearance-none bg-white"
                            value={unit}
                            onChange={(e) => { setUnit(e.target.value); setCalculatedItemWeight(null); setCalculatedItemCO2e(null); setCalculatedItemVolume(null); setCalculatedItemTrees(null); setErrorMessage(''); }}
                        >
                            <option value="mm">Milímetros (mm)</option>
                            <option value="cm">Centímetros (cm)</option>
                            <option value="m">Metros (m)</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Seleção de Forma do Tubo (apenas se for material tipo 'tube') */}
                {selectedMaterial && selectedMaterial.formType === 'tube' && (
                    <div className="mb-8">
                        <label htmlFor="tube-shape-select" className="block text-gray-700 text-lg font-semibold mb-2">
                            Forma do Tubo:
                        </label>
                        <div className="relative">
                            <select
                                id="tube-shape-select"
                                className="w-full p-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 appearance-none bg-white"
                                value={tubeShape}
                                onChange={(e) => { setTubeShape(e.target.value); setCalculatedItemWeight(null); setCalculatedItemCO2e(null); setCalculatedItemVolume(null); setCalculatedItemTrees(null); setErrorMessage(''); }}
                            >
                                <option value="">-- Selecione a forma --</option>
                                <option value="cilindrico">Cilíndrico</option>
                                <option value="retangular">Retangular</option>
                                <option value="quadrado">Quadrado</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                )}

                {/* Campos de Dimensão - Condicionais por Tipo de Material e Forma do Tubo */}
                {selectedMaterial && selectedMaterial.formType === 'block' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div>
                            <label htmlFor="length" className="block text-gray-700 text-lg font-semibold mb-2">
                                Comprimento ({unit}):
                            </label>
                            <input
                                type="number"
                                id="length"
                                className="w-full p-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                                value={length}
                                onChange={(e) => { setLength(e.target.value); setCalculatedItemWeight(null); setCalculatedItemCO2e(null); setCalculatedItemVolume(null); setCalculatedItemTrees(null); setErrorMessage(''); }}
                                placeholder="Ex: 100"
                            />
                        </div>
                        <div>
                            <label htmlFor="width" className="block text-gray-700 text-lg font-semibold mb-2">
                                Largura ({unit}):
                            </label>
                            <input
                                type="number"
                                id="width"
                                className="w-full p-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                                value={width}
                                onChange={(e) => { setWidth(e.target.value); setCalculatedItemWeight(null); setCalculatedItemCO2e(null); setCalculatedItemVolume(null); setCalculatedItemTrees(null); setErrorMessage(''); }}
                                placeholder="Ex: 50"
                            />
                        </div>
                        <div>
                            <label htmlFor="height" className="block text-gray-700 text-lg font-semibold mb-2">
                                Altura ({unit}):
                            </label>
                            <input
                                type="number"
                                id="height"
                                className="w-full p-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                                value={height}
                                onChange={(e) => { setHeight(e.target.value); setCalculatedItemWeight(null); setCalculatedItemCO2e(null); setCalculatedItemVolume(null); setCalculatedItemTrees(null); setErrorMessage(''); }}
                                placeholder="Ex: 20"
                            />
                        </div>
                    </div>
                )}

                {selectedMaterial && selectedMaterial.formType === 'custom_density_block' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div>
                            <label htmlFor="length-custom" className="block text-gray-700 text-lg font-semibold mb-2">
                                Comprimento ({unit}):
                            </label>
                            <input
                                type="number"
                                id="length-custom"
                                className="w-full p-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                                value={length}
                                onChange={(e) => { setLength(e.target.value); setCalculatedItemWeight(null); setCalculatedItemCO2e(null); setCalculatedItemVolume(null); setCalculatedItemTrees(null); setErrorMessage(''); }}
                                placeholder="Ex: 100"
                            />
                        </div>
                        <div>
                            <label htmlFor="width-custom" className="block text-gray-700 text-lg font-semibold mb-2">
                                Largura ({unit}):
                            </label>
                            <input
                                type="number"
                                id="width-custom"
                                className="w-full p-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                                value={width}
                                onChange={(e) => { setWidth(e.target.value); setCalculatedItemWeight(null); setCalculatedItemCO2e(null); setCalculatedItemVolume(null); setCalculatedItemTrees(null); setErrorMessage(''); }}
                                placeholder="Ex: 50"
                            />
                        </div>
                        <div>
                            <label htmlFor="height-custom" className="block text-gray-700 text-lg font-semibold mb-2">
                                Altura ({unit}):
                            </label>
                            <input
                                type="number"
                                id="height-custom"
                                className="w-full p-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                                value={height}
                                onChange={(e) => { setHeight(e.target.value); setCalculatedItemWeight(null); setCalculatedItemCO2e(null); setCalculatedItemVolume(null); setCalculatedItemTrees(null); setErrorMessage(''); }}
                                placeholder="Ex: 20"
                            />
                        </div>
                        <div className="md:col-span-3">
                            <label htmlFor="custom-density" className="block text-gray-700 text-lg font-semibold mb-2">
                                Densidade ({selectedMaterial.name === 'Papelão' ? 'kg/m³ - Ex: Onda simples C: 60-100, BC: 100-150, Tripla: 150-200' : 'kg/m³'}):
                            </label>
                            <input
                                type="number"
                                id="custom-density"
                                className="w-full p-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                                value={customDensity}
                                onChange={(e) => { setCustomDensity(e.target.value); setCalculatedItemWeight(null); setCalculatedItemCO2e(null); setCalculatedItemVolume(null); setCalculatedItemTrees(null); setErrorMessage(''); }}
                                placeholder={selectedMaterial.name === 'Papelão' ? "Ex: 120 (para onda BC)" : "Ex: 25"}
                            />
                        </div>
                    </div>
                )}

                {selectedMaterial && selectedMaterial.formType === 'tube' && tubeShape === 'cilindrico' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div>
                            <label htmlFor="outer-diameter" className="block text-gray-700 text-lg font-semibold mb-2">
                                Diâmetro Externo ({unit}):
                            </label>
                            <input
                                type="number"
                                id="outer-diameter"
                                className="w-full p-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                                value={outerDiameter}
                                onChange={(e) => { setOuterDiameter(e.target.value); setCalculatedItemWeight(null); setCalculatedItemCO2e(null); setCalculatedItemVolume(null); setCalculatedItemTrees(null); setErrorMessage(''); }}
                                placeholder="Ex: 50"
                            />
                        </div>
                        <div>
                            <label htmlFor="wall-thickness-cylindrical" className="block text-gray-700 text-lg font-semibold mb-2">
                                Espessura da Parede ({unit}):
                            </label>
                            <input
                                type="number"
                                id="wall-thickness-cylindrical"
                                className="w-full p-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                                value={wallThicknessCylindrical}
                                onChange={(e) => { setWallThicknessCylindrical(e.target.value); setCalculatedItemWeight(null); setCalculatedItemCO2e(null); setCalculatedItemVolume(null); setCalculatedItemTrees(null); setErrorMessage(''); }}
                                placeholder="Ex: 5"
                            />
                        </div>
                        <div>
                            <label htmlFor="tube-length-cylindrical" className="block text-gray-700 text-lg font-semibold mb-2">
                                Comprimento do Tubo ({unit}):
                            </label>
                            <input
                                type="number"
                                id="tube-length-cylindrical"
                                className="w-full p-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                                value={tubeLengthCylindrical}
                                onChange={(e) => { setTubeLengthCylindrical(e.target.value); setCalculatedItemWeight(null); setCalculatedItemCO2e(null); setCalculatedItemVolume(null); setCalculatedItemTrees(null); setErrorMessage(''); }}
                                placeholder="Ex: 2000"
                            />
                        </div>
                    </div>
                )}

                {selectedMaterial && selectedMaterial.formType === 'tube' && (tubeShape === 'retangular' || tubeShape === 'quadrado') && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div>
                            <label htmlFor="outer-dim1" className="block text-gray-700 text-lg font-semibold mb-2">
                                Dimensão Externa 1 ({unit}):
                            </label>
                            <input
                                type="number"
                                id="outer-dim1"
                                className="w-full p-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                                value={outerDim1}
                                onChange={(e) => {
                                    setOuterDim1(e.target.value);
                                    if (tubeShape === 'quadrado') {
                                        setOuterDim2(e.target.value); // Sincroniza Dimensão 2 para quadrado
                                    }
                                    setCalculatedItemWeight(null); setCalculatedItemCO2e(null); setCalculatedItemVolume(null); setCalculatedItemTrees(null); setErrorMessage('');
                                }}
                                placeholder="Ex: 100"
                            />
                        </div>
                        <div>
                            <label htmlFor="outer-dim2" className="block text-gray-700 text-lg font-semibold mb-2">
                                Dimensão Externa 2 ({unit}):
                            </label>
                            <input
                                type="number"
                                id="outer-dim2"
                                className="w-full p-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                                value={tubeShape === 'quadrado' ? outerDim1 : outerDim2} // Usa outerDim1 para quadrado
                                onChange={(e) => { setOuterDim2(e.target.value); setCalculatedItemWeight(null); setCalculatedItemCO2e(null); setCalculatedItemVolume(null); setCalculatedItemTrees(null); setErrorMessage(''); }}
                                placeholder={tubeShape === 'quadrado' ? "Auto (Quadrado)" : "Ex: 50"}
                                disabled={tubeShape === 'quadrado'}
                            />
                        </div>
                        <div>
                            <label htmlFor="wall-thickness-rectangular" className="block text-gray-700 text-lg font-semibold mb-2">
                                Espessura da Parede ({unit}):
                            </label>
                            <input
                                type="number"
                                id="wall-thickness-rectangular"
                                className="w-full p-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                                value={wallThicknessRectangular}
                                onChange={(e) => { setWallThicknessRectangular(e.target.value); setCalculatedItemWeight(null); setCalculatedItemCO2e(null); setCalculatedItemVolume(null); setCalculatedItemTrees(null); setErrorMessage(''); }}
                                placeholder="Ex: 5"
                            />
                        </div>
                        <div>
                            <label htmlFor="tube-length-rectangular" className="block text-gray-700 text-lg font-semibold mb-2">
                                Comprimento do Tubo ({unit}):
                            </label>
                            <input
                                type="number"
                                id="tube-length-rectangular"
                                className="w-full p-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                                value={tubeLengthRectangular}
                                onChange={(e) => { setTubeLengthRectangular(e.target.value); setCalculatedItemWeight(null); setCalculatedItemCO2e(null); setCalculatedItemVolume(null); setCalculatedItemTrees(null); setErrorMessage(''); }}
                                placeholder="Ex: 2000"
                            />
                        </div>
                    </div>
                )}

                {/* Seleção da Unidade de Peso */}
                <div className="mb-8">
                    <label htmlFor="weight-unit-select" className="block text-gray-700 text-lg font-semibold mb-2">
                        Unidade de Peso do Resultado:
                    </label>
                    <div className="relative">
                        <select
                            id="weight-unit-select"
                            className="w-full p-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 appearance-none bg-white"
                            value={weightUnit}
                            onChange={(e) => { setWeightUnit(e.target.value); setCalculatedItemWeight(null); setCalculatedItemCO2e(null); setCalculatedItemVolume(null); setCalculatedItemTrees(null); setErrorMessage(''); }}
                        >
                            <option value="kg">Quilogramas (kg)</option>
                            <option value="g">Gramas (g)</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Botões de Ação */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <button
                        onClick={calculateSingleItemWeight}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-indigo-300 text-xl"
                    >
                        Calcular Peso do Item
                    </button>
                    <button
                        onClick={handleAddItemToPackage}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-300 text-xl"
                    >
                        Adicionar à Embalagem
                    </button>
                </div>

                {/* Mensagens de erro */}
                {errorMessage && (
                    <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-xl text-center font-medium shadow-md">
                        {errorMessage}
                    </div>
                )}

                {/* Resultado do item individual */}
                {calculatedItemWeight !== null && (
                    <div className="mt-8 p-6 bg-blue-100 border border-blue-400 text-blue-800 rounded-xl text-center shadow-lg animate-fade-in">
                        <h2 className="text-2xl font-bold mb-2">Peso do Item:</h2>
                        <p className="text-4xl font-extrabold text-blue-700 mb-4">
                            {calculatedItemWeight} {weightUnit}
                        </p>
                        <h2 className="text-2xl font-bold mb-2">Volume do Item:</h2>
                        <p className="text-3xl font-extrabold text-orange-700 mb-4">
                            {calculatedItemVolume} m³
                        </p>
                        <h2 className="text-2xl font-bold mb-2">Estimativa de CO2e do Item:</h2>
                        <p className="text-3xl font-extrabold text-purple-700">
                            {calculatedItemCO2e} kg CO2e
                        </p>
                        {calculatedItemTrees !== null && (
                            <>
                                <h2 className="text-2xl font-bold mt-4 mb-2">Árvores Necessárias (Estimativa):</h2>
                                <p className="text-3xl font-extrabold text-green-700">
                                    {calculatedItemTrees} árvores
                                </p>
                            </>
                        )}
                        <p className="text-sm text-gray-600 mt-2">
                            *Valores de CO2e e árvores são estimativas simplificadas e representam a emissão/necessidade na produção.
                        </p>
                    </div>
                )}

                {/* Lista de Materiais Adicionados */}
                {addedMaterials.length > 0 && (
                    <div className="mt-10 p-6 bg-gray-50 rounded-xl shadow-lg">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">Itens na Embalagem:</h2>
                        <ul className="space-y-3">
                            {addedMaterials.map((item) => (
                                <li key={item.id} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm border border-gray-200">
                                    <span className="font-medium text-gray-700 flex-grow text-sm sm:text-base">
                                        {item.material.name}: {item.displayWeight} {item.displayUnit} | {item.displayVolume} m³ | {item.displayCO2e} kg CO2e
                                        {item.displayTrees !== null && ` | ${item.displayTrees} árvores`}
                                    </span>
                                    <button
                                        onClick={() => handleRemoveItem(item.id)}
                                        className="ml-4 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs font-bold transition-colors"
                                        aria-label="Remover item"
                                    >
                                        &times;
                                    </button>
                                </li>
                            ))}
                        </ul>
                        <button
                            onClick={calculateTotalPackage}
                            className="w-full mt-6 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-300 text-xl"
                        >
                            Calcular Peso Total da Embalagem
                        </button>
                    </div>
                )}

                {/* Resultado Total da Embalagem */}
                {totalWeight !== null && (
                    <div className="mt-8 p-6 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded-xl text-center shadow-lg animate-fade-in">
                        <h2 className="text-2xl font-bold mb-2">Peso Total da Embalagem:</h2>
                        <p className="text-4xl font-extrabold text-yellow-700 mb-4">
                            {totalWeight} {weightUnit}
                        </p>
                        <h2 className="text-2xl font-bold mb-2">Volume Total da Embalagem:</h2>
                        <p className="text-3xl font-extrabold text-teal-700 mb-4">
                            {totalVolume} m³
                        </p>
                        <h2 className="text-2xl font-bold mb-2">CO2e Total da Embalagem:</h2>
                        <p className="text-3xl font-extrabold text-orange-700">
                            {totalCO2e} kg CO2e
                        </p>
                        {totalTrees !== null && totalTrees > 0 && (
                            <>
                                <h2 className="text-2xl font-bold mt-4 mb-2">Árvores Necessárias (Estimativa Total):</h2>
                                <p className="text-3xl font-extrabold text-lime-700">
                                    {totalTrees} árvores
                                </p>
                            </>
                        )}
                        <p className="text-sm text-gray-600 mt-2">
                            *Soma das estimativas de CO2e e árvores dos materiais que compõem a embalagem.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;
