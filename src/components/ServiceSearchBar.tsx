import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Service, ServiceCategory } from '../types';
import { FIXIT_CATALOG, FIXIT_CATEGORIES } from '../data/catalog';
import { 
  Search, 
  X, 
  Wrench, 
  Zap, 
  Home, 
  Paintbrush, 
  ChevronRight, 
  AlertCircle, 
  Clock, 
  ShieldCheck, 
  MessageCircle,
  Sparkles,
  Wind,
  ClipboardCheck
} from 'lucide-react';
import { generateDirectWhatsAppLink, openWhatsAppSafely } from '../lib/whatsapp';

interface ServiceSearchBarProps {
  onSelectService: (service: Service) => void;
  onSelectCategory: (category: ServiceCategory) => void;
  onSearchActiveChange?: (isActive: boolean) => void;
}

// Synonyms map to enhance Spanish colloquial home repair searches in Panama
const SYNONYMS_MAP: Record<string, string[]> = {
  // Plomería
  'grifo': ['llave', 'mezclador', 'monomando', 'plomeria', 'lavamanos', 'fregadero', 'griferia'],
  'fregadero': ['cocina', 'grifo', 'mezclador', 'destape', 'desague', 'griferia', 'fregador'],
  'fregador': ['cocina', 'grifo', 'mezclador', 'fregadero', 'llave'],
  'lavamanos': ['grifo', 'mezclador', 'llave', 'destape', 'desague', 'bano', 'baño'],
  'ducha': ['regadera', 'bano', 'baño', 'cabezal', 'mezcladora'],
  'fuga': ['agua', 'tuberia', 'goteo', 'filtracion', 'gotera', 'llave', 'grifo'],
  'tuberia': ['fuga', 'agua', 'tubo', 'pvc', 'desague', 'plomero'],
  'inodoro': ['bano', 'baño', 'taza', 'wc', 'sanitario', 'sapito', 'flotador', 'destape'],
  'bano': ['inodoro', 'lavamanos', 'ducha', 'grifo', 'baño'],
  'baño': ['inodoro', 'lavamanos', 'ducha', 'grifo', 'sanitario'],
  'destape': ['obstruccion', 'atascado', 'inodoro', 'lavamanos', 'ducha', 'fregadero', 'drenaje'],
  'lavadora': ['conexion', 'manguera', 'desague', 'secadora', 'linea blanca', 'lavado'],
  'secadora': ['conexion', 'gas', 'ducto', 'lavadora', 'linea blanca'],
  'nevera': ['ice maker', 'hielo', 'agua', 'filtro', 'refrigeradora'],

  // Electricidad
  'luz': ['lampara', 'bombillo', 'foco', 'iluminacion', 'plafon', 'electricidad'],
  'lampara': ['luz', 'plafon', 'foco', 'iluminacion', 'techo'],
  'enchufe': ['toma', 'tomacorriente', 'corriente', 'energia', 'enchufe'],
  'toma': ['enchufe', 'tomacorriente', 'energia', 'corriente'],
  'interruptor': ['switch', 'apagador', 'luz', 'boton'],
  'switch': ['interruptor', 'apagador', 'luz'],
  'breaker': ['tablero', 'pastilla', 'termomagnetico', 'caja', 'cortocircuito', 'chispa'],
  'ventilador': ['techo', 'abanico', 'lampara', 'instalacion'],
  'chispa': ['urgencia', 'quemado', 'olor', 'corto', 'peligro', 'humo'],

  // Reparaciones del Hogar
  'tv': ['televisor', 'pantalla', 'soporte', 'rack', 'montaje', 'pared'],
  'soporte': ['tv', 'repisa', 'cuadro', 'anclaje', 'instalacion'],
  'cerradura': ['chapa', 'puerta', 'pomo', 'llave', 'seguridad', 'cerrojo'],
  'puerta': ['cerradura', 'chapa', 'ajuste', 'bisagra'],
  'silicon': ['silicona', 'sellado', 'tina', 'ducha', 'meson', 'fuga', 'moho'],

  // Pintura
  'pintura': ['pintar', 'pared', 'techo', 'cielo raso', 'fachada', 'resane', 'interior', 'exterior'],
  'pintar': ['pintura', 'pared', 'techo', 'cielo raso', 'cuarto', 'sala'],
  'pared': ['pintura', 'resane', 'soporte', 'interior', 'humedad'],
  'techo': ['cielo raso', 'pintura', 'ventilador', 'lampara'],
};

// Normalize string by removing accents and converting to lowercase
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

const FREQUENT_SEARCHES = [
  { label: 'Grifería lavamanos', query: 'griferia lavamanos' },
  { label: 'Fuga de agua', query: 'fuga de agua' },
  { label: 'Instalación lavadora', query: 'instalacion lavadora' },
  { label: 'Instalar lámpara', query: 'instalar lampara' },
  { label: 'Tomacorriente', query: 'tomacorriente' },
  { label: 'Pintar paredes', query: 'pintura paredes' },
];

export const ServiceSearchBar: React.FC<ServiceSearchBarProps> = ({
  onSelectService,
  onSelectCategory,
  onSearchActiveChange,
}) => {
  const [query, setQuery] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Active available categories
  const categories = useMemo(() => {
    return FIXIT_CATEGORIES.filter((c) => c.isAvailable);
  }, []);

  // Filter services matching query and category filter
  const searchResults = useMemo(() => {
    const trimmed = query.trim();
    const hasQuery = trimmed.length > 0;
    const hasCategoryFilter = activeCategoryFilter !== 'all';

    // If neither query nor specific category filter is active, return empty to not crowd
    if (!hasQuery && !hasCategoryFilter) {
      return [];
    }

    const normalizedQuery = normalizeText(trimmed);
    const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);

    // Expand search tokens with synonyms
    const expandedTokens = new Set<string>(queryTokens);
    queryTokens.forEach((token) => {
      if (SYNONYMS_MAP[token]) {
        SYNONYMS_MAP[token].forEach((syn) => expandedTokens.add(syn));
      }
      // Also check partial matches in synonym keys
      Object.keys(SYNONYMS_MAP).forEach((key) => {
        if (token.length >= 3 && (key.includes(token) || token.includes(key))) {
          SYNONYMS_MAP[key].forEach((syn) => expandedTokens.add(syn));
        }
      });
    });

    const activeServices = FIXIT_CATALOG.filter((s) => s.active !== false);

    return activeServices
      .map((service) => {
        const normName = normalizeText(service.service_name || service.nombre || '');
        const normCategory = normalizeText(service.category || service.categoria || '');
        const normDesc = normalizeText(service.description || service.descripcion || '');
        const normId = normalizeText(service.id || '');

        // Category filter check
        if (hasCategoryFilter) {
          const catMatches =
            normCategory === normalizeText(activeCategoryFilter) ||
            service.category.toLowerCase() === activeCategoryFilter.toLowerCase();
          if (!catMatches) return null;
        }

        // If no query, but category filter is set, return with base score
        if (!hasQuery) {
          return { service, score: 1 };
        }

        let score = 0;

        // 1. Direct whole query matching
        if (normName === normalizedQuery) score += 100;
        else if (normName.startsWith(normalizedQuery)) score += 60;
        else if (normName.includes(normalizedQuery)) score += 40;
        else if (normId === normalizedQuery || normId.includes(normalizedQuery)) score += 50;

        // 2. Token-by-token evaluation
        let matchedTokensCount = 0;
        for (const token of queryTokens) {
          if (normName.includes(token)) {
            score += 25;
            matchedTokensCount++;
          } else if (normDesc.includes(token)) {
            score += 12;
            matchedTokensCount++;
          } else if (normCategory.includes(token)) {
            score += 15;
            matchedTokensCount++;
          }
        }

        // 3. Synonym evaluation
        for (const syn of expandedTokens) {
          if (!queryTokens.includes(syn)) {
            if (normName.includes(syn)) score += 10;
            else if (normDesc.includes(syn)) score += 5;
          }
        }

        // Only include if there was a direct match or score > 0
        if (score > 0 || (queryTokens.length > 0 && matchedTokensCount === queryTokens.length)) {
          return { service, score };
        }

        return null;
      })
      .filter((item): item is { service: Service; score: number } => item !== null)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.service);
  }, [query, activeCategoryFilter]);

  const handleClear = () => {
    setQuery('');
    setActiveCategoryFilter('all');
    inputRef.current?.focus();
  };

  const handleFrequentClick = (searchStr: string) => {
    setQuery(searchStr);
    inputRef.current?.focus();
  };

  const getCategoryTheme = (category: ServiceCategory) => {
    switch (category) {
      case 'Diagnóstico':
        return {
          icon: <ClipboardCheck className="w-3.5 h-3.5" />,
          color: 'text-[#0B72D9]',
          bg: 'bg-[#0B72D9]/10',
          border: 'border-[#0B72D9]/30',
          label: 'Diagnóstico',
        };
      case 'Plomería':
        return {
          icon: <Wrench className="w-3.5 h-3.5" />,
          color: 'text-[#53653D]',
          bg: 'bg-[#53653D]/10',
          border: 'border-[#53653D]/30',
          label: 'Plomería',
        };
      case 'Electricidad':
        return {
          icon: <Zap className="w-3.5 h-3.5" />,
          color: 'text-[#B98A43]',
          bg: 'bg-[#B98A43]/10',
          border: 'border-[#B98A43]/30',
          label: 'Electricidad',
        };
      case 'Climatización':
      case 'Aire Acondicionado':
        return {
          icon: <Wind className="w-3.5 h-3.5" />,
          color: 'text-[#0988F5]',
          bg: 'bg-[#0988F5]/10',
          border: 'border-[#0988F5]/30',
          label: 'Climatización',
        };
      case 'Pintura':
      case 'Pintura residencial':
        return {
          icon: <Paintbrush className="w-3.5 h-3.5" />,
          color: 'text-[#B98A43]',
          bg: 'bg-[#B98A43]/10',
          border: 'border-[#B98A43]/30',
          label: 'Pintura',
        };
      case 'Reparaciones del hogar':
      default:
        return {
          icon: <Home className="w-3.5 h-3.5" />,
          color: 'text-[#082D60]',
          bg: 'bg-[#082D60]/10',
          border: 'border-[#082D60]/30',
          label: 'Reparaciones',
        };
    }
  };

  const formatPriceDisplay = (service: Service) => {
    if (service.pricing_type === 'per_unit') {
      const unit = service.unit_name || 'm²';
      const unitPrice = service.precio_lanzamiento || service.price || 3.5;
      const minCharge = service.minimum_service_charge || 75;
      return {
        amount: `$${unitPrice.toFixed(2)}`,
        unit: `/${unit}`,
        extra: `Mínimo $${minCharge}`,
      };
    }

    if (service.diagnostic_required) {
      const diagPrice = service.diagnostic_price || service.price || 25;
      return {
        amount: `$${diagPrice}.00`,
        unit: 'diagnóstico',
        extra: '100% acreditable al trabajo',
      };
    }

    const fixedPrice = service.precio_lanzamiento || service.price || 35;
    return {
      amount: `$${fixedPrice}.00`,
      unit: 'precio estándar',
      extra: 'Mano de obra incluida',
    };
  };

  const isSearchActive = query.trim().length > 0 || activeCategoryFilter !== 'all';

  useEffect(() => {
    onSearchActiveChange?.(isSearchActive);
  }, [isSearchActive, onSearchActiveChange]);

  const directWhatsAppUrl = generateDirectWhatsAppLink(
    query.trim()
      ? `Hola FIXIT, estuve buscando «${query.trim()}» y quisiera consultar si pueden realizar este trabajo en mi hogar.`
      : 'Hola FIXIT, quisiera consultar sobre un servicio de reparación para mi hogar.'
  );

  return (
    <section className="space-y-3" aria-label="Búsqueda de servicios">
      {/* 1. Input Box */}
      <div className="relative">
        <div 
          className={`flex items-center bg-[#FFFEFA] border transition-all rounded-2xl shadow-2xs ${
            isFocused 
              ? 'border-[#0B72D9] ring-2 ring-[#0B72D9]/15 shadow-xs' 
              : 'border-[#DED4C5] hover:border-[#0B72D9]/60'
          }`}
        >
          <div className="pl-3.5 pr-2 py-3 text-[#756A5D] pointer-events-none flex items-center justify-center">
            <Search className={`w-4 h-4 transition-colors ${isFocused ? 'text-[#0B72D9]' : 'text-[#756A5D]'}`} />
          </div>

          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                handleClear();
              }
            }}
            placeholder="Buscar servicio (ej. inodoro, goteo split, enchufe, pintar)..."
            aria-label="Buscar servicios de mantenimiento y reparación"
            className="w-full bg-transparent py-3 pr-2 text-sm text-[#1F2421] placeholder-[#756A5D]/75 focus:outline-none"
            autoComplete="off"
            spellCheck="false"
          />

          {query.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="mr-2 p-1.5 text-[#756A5D] hover:text-[#1F2421] rounded-xl hover:bg-[#F6F4EF] transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
              title="Borrar búsqueda"
              aria-label="Limpiar campo de búsqueda"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Category Filter Segmented Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
        <button
          type="button"
          onClick={() => setActiveCategoryFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer min-h-[34px] flex items-center ${
            activeCategoryFilter === 'all'
              ? 'bg-[#082D60] text-white shadow-2xs'
              : 'bg-[#FFFEFA] text-[#756A5D] border border-[#DED4C5] hover:border-[#756A5D]/60 hover:text-[#1F2421]'
          }`}
        >
          <span>Todos</span>
        </button>

        {categories.map((cat) => {
          const isActive = activeCategoryFilter.toLowerCase() === cat.id.toLowerCase();
          const theme = getCategoryTheme(cat.id);

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                if (isActive) {
                  setActiveCategoryFilter('all');
                } else {
                  setActiveCategoryFilter(cat.id);
                }
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer min-h-[34px] flex items-center gap-1.5 ${
                isActive
                  ? 'bg-[#082D60] text-white shadow-2xs'
                  : 'bg-[#FFFEFA] text-[#756A5D] border border-[#DED4C5] hover:border-[#756A5D]/60 hover:text-[#1F2421]'
              }`}
            >
              <span className={isActive ? 'text-white' : theme.color}>
                {theme.icon}
              </span>
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Frequent Searches Bar (Visible when not actively searching) */}
      {!isSearchActive && (
        <div className="pt-0.5">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px] text-[#756A5D]">
            <span className="font-semibold text-[#1F2421] whitespace-nowrap shrink-0 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#B98A43]" />
              Frecuentes:
            </span>
            {FREQUENT_SEARCHES.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => handleFrequentClick(item.query)}
                className="px-2.5 py-1 rounded-lg bg-[#FFFEFA] border border-[#DED4C5]/80 hover:border-[#0B72D9] text-[#756A5D] hover:text-[#0B72D9] transition-colors whitespace-nowrap cursor-pointer active:scale-95"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4. Active Search Results Section */}
      {isSearchActive && (
        <div className="space-y-3 pt-1 animate-in fade-in duration-200">
          <div className="flex items-center justify-between px-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#1F2421]">
                {searchResults.length} {searchResults.length === 1 ? 'servicio encontrado' : 'servicios encontrados'}
              </span>
              {query.trim() && (
                <span className="text-xs text-[#756A5D] truncate max-w-[160px] sm:max-w-[220px]">
                  para «{query.trim()}»
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {activeCategoryFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => onSelectCategory(activeCategoryFilter as ServiceCategory)}
                  className="text-xs text-[#082D60] font-semibold hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <span className="hidden sm:inline">Ver categoría</span>
                  <span className="sm:hidden">Categoría</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-[#0B72D9] hover:underline font-semibold cursor-pointer"
              >
                Restablecer
              </button>
            </div>
          </div>

          {/* Results List */}
          {searchResults.length > 0 ? (
            <div className="space-y-2.5">
              {searchResults.map((service) => {
                const theme = getCategoryTheme(service.category);
                const price = formatPriceDisplay(service);

                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => onSelectService(service)}
                    className="w-full text-left bg-[#FFFEFA] hover:bg-[#FFFEFA] border border-[#DED4C5] hover:border-[#0B72D9] rounded-2xl p-3.5 sm:p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col group active:scale-[0.99] cursor-pointer"
                    id={`search-result-${service.id.toLowerCase()}`}
                  >
                    {/* Header Row: Category Badge & Chevron */}
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-5 h-5 rounded-md flex items-center justify-center ${theme.bg} ${theme.color}`}>
                          {theme.icon}
                        </span>
                        <span className={`text-[11px] font-semibold uppercase tracking-wider ${theme.color}`}>
                          {theme.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-xs text-[#756A5D] group-hover:text-[#0B72D9] transition-colors">
                        <span className="text-[11px] font-medium hidden sm:inline">Ver precio</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>

                    {/* Title */}
                    <h4 className="font-serif font-bold text-sm sm:text-base text-[#1F2421] group-hover:text-[#0B72D9] transition-colors leading-snug mb-1">
                      {service.service_name}
                    </h4>

                    {/* Description */}
                    <p className="text-xs text-[#756A5D] leading-relaxed line-clamp-2 mb-2.5">
                      {service.description}
                    </p>

                    {/* Pricing & Guarantee Footer */}
                    <div className="pt-2 border-t border-[#DED4C5]/50 flex items-center justify-between flex-wrap gap-2 text-xs">
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm sm:text-base font-bold text-[#1F2421] font-mono tabular-nums">
                          {price.amount}
                        </span>
                        <span className="text-[11px] text-[#756A5D] font-normal">
                          {price.unit}
                        </span>
                        {price.extra && (
                          <span className="text-[11px] text-[#756A5D] hidden sm:inline">
                            · {price.extra}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-[#756A5D]">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#756A5D]" />
                          {service.estimated_duration}
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-[#0B72D9]" />
                          Garantía {service.warranty_days}d
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            /* No Results Fallback with Direct WhatsApp Alternative */
            <div className="bg-[#FFFEFA] border border-[#DED4C5] rounded-2xl p-5 text-center space-y-3.5">
              <div className="w-10 h-10 rounded-full bg-[#F6F4EF] text-[#756A5D] mx-auto flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-serif font-bold text-base text-[#1F2421]">
                  No encontramos servicios para esta búsqueda
                </h4>
                <p className="text-xs text-[#756A5D] max-w-sm mx-auto leading-relaxed">
                  ¿Tu problema es particular o requieres una cotización a la medida? Podemos coordinar tu trabajo directamente por WhatsApp.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => openWhatsAppSafely(directWhatsAppUrl)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <MessageCircle className="w-4 h-4 fill-white" />
                  <span>Consultar por WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="w-full sm:w-auto px-4 py-2.5 bg-[#F6F4EF] hover:bg-[#DED4C5]/40 text-[#1F2421] text-xs font-semibold rounded-xl border border-[#DED4C5] cursor-pointer transition-all"
                >
                  <span>Ver todas las categorías</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
