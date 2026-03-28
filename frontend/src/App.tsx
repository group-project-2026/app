import heroImg from "./assets/hero.jpeg";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from "./components/ui/card";

function App() {
  return (
    <>
      <div className="flex justify-center">
        <img src={heroImg} width="600" height="200" alt="Dawid Jasper" />
      </div>
      <div className="flex justify-center mt-10">
        <Card className="max-w-87.5">
          <CardHeader>
            <CardTitle>Tailwind + shadcn test</CardTitle>
            <CardDescription>
              Lorem ipsum dolor, sit amet consectetur adipisicing elit. Ipsam,
              eum.
            </CardDescription>
          </CardHeader>
          <CardContent>
            Lorem ipsum dolor sit amet consectetur adipisicing elit. At?
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default App;
