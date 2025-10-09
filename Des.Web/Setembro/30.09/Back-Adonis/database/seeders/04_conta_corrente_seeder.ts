import { BaseSeeder } from '@adonisjs/lucid/seeders'
import ContaCorrente from '#models/conta_corrente'
import Cliente from '#models/cliente'

export default class ContaCorrenteSeeder extends BaseSeeder {
  public async run() {
    // Busca clientes já cadastrados
    const clientes = await Cliente.all()

    for (let i = 0; i < clientes.length; i++) {
      await ContaCorrente.create({
        numero_conta: `1000${i + 1}`,
        numero_agencia: '0001',
        saldo: 1000, // saldo inicial
        clienteId: clientes[i].id,
      })
    }
  }
}