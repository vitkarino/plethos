import { getSignalProvider } from '../providers'
import { ProjectsRepository } from '../repositories/projectsRepository'
import { RecordingsRepository } from '../repositories/recordingsRepository'
import { UsersRepository } from '../repositories/usersRepository'
import { ProjectsService } from './projectsService'
import { RecordingsService } from './recordingsService'
import { UsersService } from './usersService'

function createContainer() {
  const usersRepository = new UsersRepository()
  const projectsRepository = new ProjectsRepository()
  const recordingsRepository = new RecordingsRepository()

  const usersService = new UsersService(usersRepository)
  const projectsService = new ProjectsService(projectsRepository, usersRepository)
  const recordingsService = new RecordingsService(
    recordingsRepository,
    usersRepository,
    projectsRepository,
    getSignalProvider(),
  )

  return {
    usersService,
    projectsService,
    recordingsService,
  }
}

const globalServices = globalThis as typeof globalThis & {
  __pulsoServices?: ReturnType<typeof createContainer>
}

export function useServices() {
  const services = globalServices.__pulsoServices ?? createContainer()

  if (process.env.NODE_ENV !== 'production') {
    globalServices.__pulsoServices = services
  }

  return services
}
