import axios, { AxiosError } from "axios";


// Variavel para informar se está acontecendo uma requisição de refresh token
let isRefreshing = false;
// Variavel para armazenar a fila de requisições que falharam por token expirado
let failedRequestQueue = [];

// Tipagem dos dados de response da api de autenticação

  // Cria as configurações iniciais do Axios
  export const api = axios.create({
    baseURL: "http://localhost:3333",
    headers: {
      Authorization: Bearer your_token,
    },
  });

  // Cria um interceptor para interceptar todas as requisições que forem feitas
  api.interceptors.response.use(
    (response) => {
      // Se a requisição der sucesso, retorna a resposta
      return response;
    },
    (error: AxiosError) => {
      // Se a requisição der erro, verifica se o erro é de autenticação
      if (error.response.status === 401) {
        // Se o erro for de autenticação, verifica se o erro foi de token expirado
        if (error.response.data?.code === "token.expired") {
          // Recupera o refresh token do localStorage
          const refreshToken = localStorage.getItem("refreshToken");
          // Recupera toda a requisição que estava sendo feita e deu erro para ser refeita após o refresh token
          const originalConfig = error.config;

          //Verifica se já existe uma requisição de refresh token em andamento.
          if (!isRefreshing) {
           
            isRefreshing = true;

             //Realiza a requisição de refresh token.
            //Realiza a requisição de refresh token.
            api
            .post("/refresh", { refreshToken })
            .then((response) => {
              //Extrai e salva no localstrogare o novo token e refresh token da resposta.
              const { token, refreshToken: newRefreshToken } = response.data;

              localStorage.setItem("token", token);
              localStorage.setItem("refreshToken", newRefreshToken);

              //Atualiza o cabeçalho de autorização na configruação do axios.
              api.defaults.headers["Authorization"] = `Bearer ${token}`;

              //Refaz todas as requisições que estavam na fila e falharam
              failedRequestQueue.forEach((request) => request.onSuccess(token));
              failedRequestQueue = [];
            })
            .catch((err) => {
              //Em caso de erro, processa as requisições com falha e desloga o usuário se necessário.
              failedRequestQueue.forEach((request) => request.onFailure(err));
              failedRequestQueue = [];

              signOut();
            })
            .finally(() => {
              //Marca que a requisição de refresh token terminou.
              isRefreshing = false;
            });
          }

        //  Usando Promise para executar a requisição após o refresh token
        return new Promise((resolve, reject) => {
          //  Adiciona a requisição na fila para ser refeita após o refresh token
          failedRequestQueue.push({
            //  Em caso de sucesso, define o novo token no header e refaz a requisição
            onSuccess: (token: string) => {
              originalConfig.headers["Authorization"] = `Bearer ${token}`;
              resolve(api(originalConfig));
            },
            //  Em caso de erro, retorna o erro
            onFailure: (err: AxiosError) => {
              reject(err);
            },
          });
        });

        } else {
          // Caso der erro desloga o usuário
          signOut();
        }
      }

      // Se não cair em nenhum if retorna um error padrão
      return Promise.reject(error);
    }
  );

