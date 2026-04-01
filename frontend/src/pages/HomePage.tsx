import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Globe, Database, BarChart3, ArrowRight } from "lucide-react";
import { CosmicParticles } from "@/components/CosmicParticles";

export function HomePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const features = [
    {
      icon: Globe,
      title: t("navigation.universeMap"),
      description: "Interaktywna mapa 3D obiektów kosmicznych z możliwością filtrowania i szczegółowych informacji",
      path: "/universe-map",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: Database,
      title: t("navigation.sources"),
      description: "Przeglądaj i filtruj źródła promieniowania gamma z katalogów astronomicznych",
      path: "/sources",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: BarChart3,
      title: t("navigation.analytics"),
      description: "Zaawansowana analityka katalogów: emisja, istotność statystyczna i porównania",
      path: "/source-analytics",
      color: "from-orange-500 to-red-500"
    }
  ];

  return (
    <main className="min-h-screen w-full flex flex-col text-white bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative">
      <CosmicParticles />
      <div className="container mx-auto px-4 py-16 flex-1 flex flex-col relative" style={{ zIndex: 1 }}>
        {/* Hero Section */}
        <div className="text-center mb-16 mt-8">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Gamma-Ray Observatory
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto">
            Eksploruj wszechświat promieniowania gamma
          </p>
          <p className="text-base md:text-lg text-slate-400 max-w-2xl mx-auto mt-4">
            Platforma do analizy i wizualizacji źródeł promieniowania gamma z katalogów Fermi, HAWC, LHAASO, NED, TeVCat i MAGIC
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card 
                key={index}
                className="relative overflow-hidden bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-all duration-300 hover:scale-105 cursor-pointer group"
                onClick={() => navigate(feature.path)}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                <CardHeader>
                  <div className={`h-12 w-12 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-slate-400">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-between group-hover:bg-white/5"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(feature.path);
                    }}
                  >
                    Otwórz
                    <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-auto">
          <div className="bg-slate-900/30 border border-slate-800 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-blue-400">6</div>
            <div className="text-sm text-slate-400 mt-1">Katalogów</div>
          </div>
          <div className="bg-slate-900/30 border border-slate-800 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-purple-400">1000+</div>
            <div className="text-sm text-slate-400 mt-1">Źródeł</div>
          </div>
          <div className="bg-slate-900/30 border border-slate-800 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-pink-400">8</div>
            <div className="text-sm text-slate-400 mt-1">Klas obiektów</div>
          </div>
          <div className="bg-slate-900/30 border border-slate-800 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-orange-400">3D</div>
            <div className="text-sm text-slate-400 mt-1">Wizualizacja</div>
          </div>
        </div>
      </div>
    </main>
  );
}
