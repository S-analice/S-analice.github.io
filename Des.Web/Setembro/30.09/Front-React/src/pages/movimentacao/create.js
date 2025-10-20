import { useNavigate } from 'react-router';
import { useState, useEffect } from 'react';
import { Container, Alert } from 'react-bootstrap';
import { OrbitProgress } from "react-loading-indicators";
import NavigationBar from '../../components/navigationbar';
import { Label, Input, Select, Submit } from "./style";
import { Client } from '../../api/client';
import { getPermissions } from '../../service/PermissionService';
import { getDataUser } from '../../service/UserService';

export default function CreateMovimentacao() {
    const [tipo, setTipo] = useState('transferencia');
    const [valor, setValor] = useState('');
    const [cpfDestino, setCpfDestino] = useState('');
    const [descricao, setDescricao] = useState('');
    const [dataMovimentacao, setDataMovimentacao] = useState(new Date());
    const [contaOrigemEncontrada, setContaOrigemEncontrada] = useState(null);
    const [contaDestinoEncontrada, setContaDestinoEncontrada] = useState(null);
    const [erroDestino, setErroDestino] = useState('');
    const [load, setLoad] = useState(true);

    const navigate = useNavigate();
    const permissions = getPermissions();
    const dataUser = getDataUser();

    function verifyPermission() {
        if (!dataUser) navigate('/login');
        else if (permissions.createMovimentacao === 0) navigate(-1);
    }

    async function buscarContaOrigemCliente() {
        try {
            const response = await Client.get('contasCorrentes');
            if (response.data.data && response.data.data.length > 0) {
                const contaDoUsuario = response.data.data.find(c =>
                    c.cliente?.email === dataUser.email
                );
                if (contaDoUsuario) setContaOrigemEncontrada(contaDoUsuario);
            }
        } catch {
            console.error("Erro ao buscar conta de origem");
        }
    }

    async function buscarContaDestinoPorCPF(cpf) {
        if (!cpf) {
            setContaDestinoEncontrada(null);
            setErroDestino('');
            return;
        }

        try {
            const response = await Client.get('contasCorrentes');
            if (response.data.data) {
                const contaEncontrada = response.data.data.find(c => c.cliente?.cpf === cpf);
                if (!contaEncontrada) {
                    setContaDestinoEncontrada(null);
                    setErroDestino('❌ Nenhuma conta encontrada com esse CPF.');
                    return;
                }

                if (contaEncontrada.cliente?.cpf === contaOrigemEncontrada?.cliente?.cpf) {
                    setContaDestinoEncontrada(null);
                    setErroDestino('❌ Não é possível transferir para sua própria conta.');
                    return;
                }

                setContaDestinoEncontrada(contaEncontrada);
                setErroDestino('');
            }
        } catch {
            setErroDestino('Erro ao buscar conta destino pelo CPF.');
        }
    }

    useEffect(() => {
        verifyPermission();
        buscarContaOrigemCliente();
        setTimeout(() => setLoad(false), 500);
    }, []);

    useEffect(() => {
        if (cpfDestino.length === 11) {
            const timer = setTimeout(() => buscarContaDestinoPorCPF(cpfDestino), 600);
            return () => clearTimeout(timer);
        }
    }, [cpfDestino]);

    function sendData() {
        if (!contaOrigemEncontrada) return alert("Conta de origem não encontrada.");
        if (!contaDestinoEncontrada) return alert("Informe um CPF de destino válido.");
        if (contaOrigemEncontrada.saldo < parseFloat(valor)) return alert("Saldo insuficiente.");

        const movimentacao = {
            tipo: tipo,
            valor: parseFloat(valor),
            conta_origem_id: contaOrigemEncontrada.id,
            conta_destino_id: contaDestinoEncontrada.id,
            descricao,
            data_movimentacao: dataMovimentacao.toISOString().slice(0, 19).replace('T', ' ')
        };

        Client.post('movimentacoes', movimentacao)
            .then(() => navigate('/movimentacoes'))
            .catch(err => alert(err.response?.data?.message || "Erro ao criar movimentação"));
    }

    return (
        <>
            <NavigationBar />
            {load ? (
                <Container className="d-flex justify-content-center mt-5">
                    <OrbitProgress variant="spokes" color="#582770" size="medium" />
                </Container>
            ) : (
                <Container className='mt-3'>
                    {contaOrigemEncontrada && (
                        <Alert variant="success" className="small py-2">
                            ✅ Conta origem: <strong>{contaOrigemEncontrada.numeroConta}</strong> — {contaOrigemEncontrada.cliente?.nomeCompleto}  
                            <br />Saldo: <strong>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                                .format(contaOrigemEncontrada.saldo)}
                            </strong>
                        </Alert>
                    )}

                    <div className="row">
                        <div className="col-md-6">
                            <Label>CPF do Destinatário</Label>
                            <Input
                                type="text"
                                value={cpfDestino}
                                onChange={e => setCpfDestino(e.target.value.replace(/\D/g, ''))}
                                maxLength="11"
                                placeholder="Digite o CPF do destinatário"
                            />
                            {contaDestinoEncontrada && (
                                <Alert variant="success" className="small py-2 mt-2">
                                    ✅ Conta encontrada: <strong>{contaDestinoEncontrada.numeroConta}</strong> - {contaDestinoEncontrada.cliente?.nomeCompleto}
                                </Alert>
                            )}
                            {erroDestino && (
                                <Alert variant="danger" className="small py-2 mt-2">
                                    {erroDestino}
                                </Alert>
                            )}
                        </div>
                        <div className="col-md-6">
                            <Label>Valor</Label>
                            <Input
                                type="number"
                                value={valor}
                                onChange={e => setValor(e.target.value)}
                                step="0.01"
                                min="0.01"
                                placeholder="Digite o valor"
                            />
                        </div>
                    </div>

                    <div className="mt-3">
                        <Label>Descrição</Label>
                        <Input
                            type="text"
                            value={descricao}
                            onChange={e => setDescricao(e.target.value)}
                            placeholder="Descrição da transferência"
                        />
                    </div>

                    <div className="mt-3">
                        <Label>Data e Hora da Movimentação</Label>
                        <Input
                            type="datetime-local"
                            value={dataMovimentacao.toISOString().slice(0,16)}
                            onChange={e => setDataMovimentacao(new Date(e.target.value))}
                        />
                    </div>

                    <div className="mt-3 d-flex gap-2">
                        <Submit value="Voltar" onClick={() => navigate('/movimentacoes')} />
                        <Submit
                            value="Cadastrar"
                            onClick={sendData}
                            disabled={!valor || !cpfDestino || !contaDestinoEncontrada}
                        />
                    </div>
                </Container>
            )}
        </>
    );
}