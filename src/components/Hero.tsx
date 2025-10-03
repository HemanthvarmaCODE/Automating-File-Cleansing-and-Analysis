import { Button } from "@/components/ui/button";
import { Shield, Upload, FileCheck, Lock } from "lucide-react";
import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-hero">
      {/* Animated background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      
      {/* Scanning line effect */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-transparent animate-scan-line" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 text-center">
        {/* Logo/Icon */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <Shield className="w-24 h-24 text-primary animate-glow-pulse" />
            <Lock className="w-10 h-10 text-accent absolute bottom-0 right-0 animate-float" />
          </div>
        </div>

        {/* Main heading */}
        <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
          PII Cleansing & Analysis
        </h1>
        
        <p className="text-xl md:text-2xl text-muted-foreground mb-4 max-w-3xl mx-auto">
          Automated File Cleansing Platform for Security Consultants
        </p>
        
        <p className="text-base md:text-lg text-muted-foreground/80 mb-12 max-w-2xl mx-auto">
          Remove sensitive client data, mask PII, and extract meaningful insights from diverse file formats with AI-powered automation
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Link to="/upload">
            <Button 
              size="lg" 
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow text-lg px-8 py-6 rounded-xl font-semibold transition-all hover:scale-105"
            >
              <Upload className="mr-2 h-5 w-5" />
              Start Cleansing Files
            </Button>
          </Link>
          
          <Link to="/dashboard">
            <Button 
              size="lg" 
              variant="outline"
              className="border-primary/50 text-primary hover:bg-primary/10 text-lg px-8 py-6 rounded-xl font-semibold transition-all hover:scale-105"
            >
              <FileCheck className="mr-2 h-5 w-5" />
              View Dashboard
            </Button>
          </Link>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {[
            {
              icon: Shield,
              title: "PII Redaction",
              desc: "Automatically remove names, emails, phone numbers & sensitive data"
            },
            {
              icon: FileCheck,
              title: "Multi-Format Support",
              desc: "Process CSV, PDF, PPTX, images with OCR & text extraction"
            },
            {
              icon: Lock,
              title: "AI Analysis",
              desc: "Extract insights from IAM policies, firewall rules & logs"
            }
          ].map((feature, idx) => (
            <div 
              key={idx}
              className="bg-card border border-border rounded-2xl p-6 backdrop-blur-sm hover:border-primary/50 transition-all hover:shadow-glow"
            >
              <feature.icon className="w-12 h-12 text-primary mb-4 mx-auto" />
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Hero;
